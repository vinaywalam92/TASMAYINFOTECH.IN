"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  destroyAllSessions,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  DUMMY_HASH,
  randomToken,
  sha256,
} from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { mergeGuestCart } from "@/lib/cart";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { verifyHuman, HUMAN_CHECK_MESSAGE } from "@/lib/spam";
import { sendEmail } from "@/lib/integrations/email";
import { passwordResetEmail } from "@/lib/emails";
import { SITE_URL } from "@/lib/constants";
import { emailSchema, fieldErrors, formDataToObject, loginSchema, passwordSchema, registerSchema, type ActionState } from "@/lib/validators";
import { audit } from "@/lib/audit";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";

export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`register:${ip}`, 10, 3600);
  if (!rl.ok) return { message: "Too many sign-up attempts. Please try again later." };

  const human = await verifyHuman(fd, ip);
  if (!human.ok) return { message: HUMAN_CHECK_MESSAGE };

  const raw = formDataToObject(fd);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: { name: raw.name ?? "", email: raw.email ?? "", phone: raw.phone ?? "" } };
  }
  const { name, email, phone, password } = parsed.data;

  // Note: telling the visitor an email is taken reveals that it is registered. This is the usual
  // sign-up trade-off; add email verification if enumeration is a concern for you.
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: "An account with this email already exists. Try signing in." }, values: { name, email, phone: phone ?? "" } };
  }

  const user = await db.user.create({
    data: { name, email, phone: phone ?? null, passwordHash: await hashPassword(password) }, // role defaults to CUSTOMER
  });
  await createSession(user.id);
  await mergeGuestCart(user.id);
  redirect(safeNext(raw.next, "/account"));
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const raw = formDataToObject(fd);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email: raw.email ?? "" } };
  const { email, password } = parsed.data;

  const [byIp, byEmail] = await Promise.all([rateLimit(`login-ip:${ip}`, 30, 900), rateLimit(`login-email:${email}`, 8, 900)]);
  if (!byIp.ok || !byEmail.ok) {
    return { message: "Too many attempts. Please wait a few minutes and try again.", values: { email } };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Always run a hash comparison so response time does not reveal whether the email exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) return { message: GENERIC_LOGIN_ERROR, values: { email } };

  await createSession(user.id);
  await mergeGuestCart(user.id);
  redirect(safeNext(raw.next, "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const parsed = emailSchema.safeParse(String(fd.get("email") ?? ""));
  const generic: ActionState = {
    ok: true,
    message: "If an account exists for that email, we have sent a link to reset the password. It expires in 60 minutes.",
  };
  if (!parsed.success) return { errors: { email: "Enter a valid email address" } };

  const [byIp, byEmail] = await Promise.all([rateLimit(`forgot-ip:${ip}`, 10, 3600), rateLimit(`forgot-email:${parsed.data}`, 3, 3600)]);
  if (!byIp.ok || !byEmail.ok) return generic; // do not reveal throttling per address

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user && user.isActive) {
    const token = randomToken(32);
    await db.passwordReset.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
    });
    const mail = passwordResetEmail(user.name, `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`);
    await sendEmail({ to: user.email, ...mail });
  }
  return generic;
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`reset:${ip}`, 15, 3600);
  if (!rl.ok) return { message: "Too many attempts. Please try again later." };

  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return { errors: { password: pw.error.issues[0].message } };
  if (password !== confirm) return { errors: { confirm: "Passwords do not match" } };

  const record = token ? await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { message: "This reset link is invalid or has expired. Please request a new one." };
  }

  const hash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
    db.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }), // sign out everywhere
  ]);
  await audit(record.userId, "auth.password_reset", "User", record.userId);
  redirect("/login?reset=1");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/profile");
  const rl = await rateLimit(`chpw:${user.id}`, 8, 3600);
  if (!rl.ok) return { message: "Too many attempts. Please try again later." };

  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  const pw = passwordSchema.safeParse(next);
  if (!pw.success) return { errors: { password: pw.error.issues[0].message } };

  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return { errors: { current: "Current password is incorrect" } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Invalidate every other session, then keep this browser signed in with a fresh one.
  await destroyAllSessions(user.id);
  await createSession(user.id);
  await audit(user.id, "auth.password_changed", "User", user.id);
  return { ok: true, message: "Password updated. Other devices have been signed out." };
}
