import { z } from "zod";

// Sanitize string - strip potential XSS
const safeString = (maxLen = 255) =>
  z.string().trim().max(maxLen).refine(
    (val) => !/<script/i.test(val),
    "Invalid characters detected"
  );

const safeOptionalString = (maxLen = 255) =>
  safeString(maxLen).optional().or(z.literal(""));

// Auth schemas
export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
});

export const signupPasswordSchema = z.string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Uppercase letter required")
  .regex(/[a-z]/, "Lowercase letter required")
  .regex(/[0-9]/, "Number required")
  .regex(/[^A-Za-z0-9]/, "Special character required");

// Employee schema
export const employeeSchema = z.object({
  name: safeString(100).min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: safeOptionalString(20),
  nationality: safeOptionalString(50),
  position: safeOptionalString(50),
  salary: z.string().refine(v => !v || !isNaN(parseFloat(v)), "Must be a number"),
  join_date: z.string().optional().or(z.literal("")),
  visa_expiry: z.string().optional().or(z.literal("")),
  passport_no: safeOptionalString(30),
  visa_no: safeOptionalString(30),
});

// Work order schema
export const workOrderSchema = z.object({
  title: safeString(200).min(1, "Title is required"),
  type: z.string().min(1),
  priority: z.string().min(1),
  description: safeString(2000).optional().default(""),
  due_date: z.string().optional().default(""),
  status: z.string().min(1),
});

// Quotation schema
export const quotationSchema = z.object({
  client_id: z.string().optional().default(""),
  subtotal: z.string().refine(v => !v || !isNaN(parseFloat(v)), "Must be a number"),
  valid_until: z.string().optional().default(""),
  status: z.string().min(1),
});

// Invoice schema
export const invoiceSchema = z.object({
  client_id: z.string().uuid().optional().or(z.literal("")),
  subtotal: z.string().refine(v => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), "Must be a positive number"),
  due_date: z.string().optional().default(""),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
});

// Client schema
export const clientSchema = z.object({
  name: safeString(100).min(1, "Name is required"),
  contact_person: safeOptionalString(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: safeOptionalString(20),
  industry: safeOptionalString(50),
  location: safeOptionalString(200),
});

// Facility schema
export const facilitySchema = z.object({
  name: safeString(100).min(1, "Name is required"),
  type: z.string().min(1),
  location: safeOptionalString(200),
  emirate: safeOptionalString(50),
  area_sqm: z.string().refine(v => !v || !isNaN(parseFloat(v)), "Must be a number").optional().default(""),
});

// Accommodation schema
export const accommodationSchema = z.object({
  camp_name: safeString(100).min(1, "Name is required"),
  location: safeOptionalString(200),
  total_beds: z.string().refine(v => !v || (!isNaN(parseInt(v)) && parseInt(v) >= 0), "Must be a positive number"),
  cost_per_bed: z.string().refine(v => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), "Must be a positive number"),
});

// Asset schema
export const assetSchema = z.object({
  name: safeString(100).min(1, "Name is required"),
  category: z.string().min(1),
  location: safeOptionalString(200),
  purchase_price: z.string().refine(v => !v || !isNaN(parseFloat(v)), "Must be a number").optional().default(""),
  purchase_date: z.string().optional().default(""),
});

// Helpdesk ticket schema
export const ticketSchema = z.object({
  title: safeString(200).min(1, "Title is required"),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  description: safeString(2000).optional().default(""),
});

// Announcement schema
export const announcementSchema = z.object({
  title: safeString(200).min(1, "Title is required"),
  message: safeString(5000).optional().default(""),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  target_audience: z.string().optional().default("all"),
});

// Generic search sanitizer
export function sanitizeSearchInput(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/[<>"'&]/g, "").slice(0, 200);
}

// Password strength checker
export function isPasswordStrong(password: string): boolean {
  return signupPasswordSchema.safeParse(password).success;
}

export type LoginFormData = z.infer<typeof loginSchema>;
export type WorkOrderFormData = z.infer<typeof workOrderSchema>;
export type QuotationFormData = z.infer<typeof quotationSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
