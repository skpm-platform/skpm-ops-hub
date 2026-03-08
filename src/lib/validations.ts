import { z } from "zod";

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

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  nationality: z.string().max(50).optional().or(z.literal("")),
  position: z.string().max(50).optional().or(z.literal("")),
  salary: z.string().refine(v => !v || !isNaN(parseFloat(v)), "Must be a number"),
  join_date: z.string().optional().or(z.literal("")),
  visa_expiry: z.string().optional().or(z.literal("")),
  passport_no: z.string().max(30).optional().or(z.literal("")),
  visa_no: z.string().max(30).optional().or(z.literal("")),
});

export const workOrderSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title too long"),
  type: z.string().min(1),
  priority: z.string().min(1),
  description: z.string().max(2000).optional().default(""),
  due_date: z.string().optional().default(""),
  status: z.string().min(1),
});

export const quotationSchema = z.object({
  client_id: z.string().optional().default(""),
  subtotal: z.string().refine(v => !v || !isNaN(parseFloat(v)), "Must be a number"),
  valid_until: z.string().optional().default(""),
  status: z.string().min(1),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type WorkOrderFormData = z.infer<typeof workOrderSchema>;
export type QuotationFormData = z.infer<typeof quotationSchema>;
