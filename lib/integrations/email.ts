import "server-only";
import nodemailer from "nodemailer";

/**
 * Email integration boundary.
 *
 * Configure SMTP_* and EMAIL_FROM (see .env.example). When SMTP is NOT configured nothing is
 * sent: the call returns { sent: false } and the server log says so explicitly, so you can never
 * mistake a missing integration for a delivered email.
 */
export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type EmailResult = { sent: boolean; reason?: string };

export function isEmailConfigured(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.EMAIL_FROM;
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.warn(`[email] NOT CONFIGURED - not sent. Subject: "${msg.subject}" To: ${msg.to}`);
    if (process.env.NODE_ENV !== "production") console.warn(`[email:dev] ${msg.text}`);
    return { sent: false, reason: "Email service not configured" };
  }
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
    return { sent: false, reason: "Email delivery failed" };
  }
}
