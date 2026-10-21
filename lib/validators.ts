import { z } from "zod";

const trim = (s: unknown) => (typeof s === "string" ? s.trim() : s);

export const emailSchema = z.preprocess(trim, z.string().email("Enter a valid email address").max(254).transform((v) => v.toLowerCase()));

/** Indian mobile: optional +91 / 0 prefix, then 10 digits starting 6–9. Normalised to 10 digits. */
export const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=[6-9]\d{9}$)/, "") : v),
  z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
);

export const pincodeSchema = z.preprocess(trim, z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"));

export const gstinSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
);

export const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : trim(v)), z.string().max(max).optional());

export const requiredText = (label: string, max = 200) =>
  z.preprocess(trim, z.string().min(1, `${label} is required`).max(max));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use at most 72 characters") // bcrypt ignores anything beyond 72 bytes
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
] as const;

export const addressSchema = z.object({
  name: requiredText("Full name", 100),
  phone: phoneSchema,
  line1: requiredText("Address line 1", 200),
  line2: optionalText(200),
  city: requiredText("City", 80),
  state: z.preprocess(trim, z.enum(INDIAN_STATES, { errorMap: () => ({ message: "Select a state" }) })),
  pincode: pincodeSchema,
});
export type AddressInput = z.infer<typeof addressSchema>;

export const registerSchema = z.object({
  name: requiredText("Name", 100),
  email: emailSchema,
  phone: z.union([phoneSchema, z.literal("").transform(() => undefined)]).optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(128) });

export const contactSchema = z.object({
  name: requiredText("Name", 100),
  company: optionalText(120),
  email: emailSchema,
  phone: phoneSchema,
  enquiryType: requiredText("Enquiry type", 60),
  message: z.preprocess(trim, z.string().min(10, "Please add a few more details").max(3000)),
  productRef: optionalText(200),
  consent: z.literal("on", { errorMap: () => ({ message: "Please accept the privacy notice to continue" }) }),
});

export const quoteSchema = z.object({
  kind: z.enum(["BULK", "QUOTE", "SOURCING", "TENDER", "REQUIREMENTS"]),
  name: requiredText("Name", 100),
  company: optionalText(120),
  organisation: optionalText(120),
  email: emailSchema,
  phone: phoneSchema,
  gstin: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), gstinSchema.optional()),
  items: z.preprocess(trim, z.string().min(5, "Describe the products you need").max(4000)),
  quantity: optionalText(100),
  budget: optionalText(100),
  timeline: optionalText(100),
  deliveryCity: optionalText(100),
  notes: optionalText(3000),
  consent: z.literal("on", { errorMap: () => ({ message: "Please accept the privacy notice to continue" }) }),
});

// ───────────────────────── helpers shared by actions / routes ─────────────────────────

export const PIN_REGEX = /^[1-9]\d{5}$/;
export const pinSchema = pincodeSchema;

/** Returns the 10-digit Indian mobile number, or null when the input is not one. */
export function normalizeIndianMobile(input: string): string | null {
  const s = input.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=[6-9]\d{9}$)/, "");
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}

export const couponInputSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.string().min(2, "Enter a coupon code").max(40).regex(/^[A-Z0-9_-]+$/, "Coupon codes use letters, numbers, - and _"),
);

/** Optional GSTIN: blank → undefined, otherwise must be a valid-looking GSTIN. */
export const optionalGstin = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  gstinSchema.optional(),
);

/** FormData → plain string record (first value wins; files ignored). */
export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !(k in out)) out[k] = v;
  }
  return out;
}

/** Result shape for forms driven by useActionState. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Echoed back so inputs keep what the user typed after a failed submit. */
  values?: Record<string, string>;
};

/** Flatten zod errors into { field: message } */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.length ? i.path.join(".") : "form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string>; data?: Record<string, unknown> };
export const initialFormState: FormState = { ok: false };
