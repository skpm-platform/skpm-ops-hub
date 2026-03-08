import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
