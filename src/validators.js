import { z } from "zod";

const positiveId = z.coerce.number().int().positive().max(2_147_483_647);
const quantity = z.coerce.number().int().positive().max(2_147_483_647);
const nonnegativeQuantity = z.coerce.number().int().nonnegative().max(2_147_483_647);
const price = z
  .coerce.number()
  .positive()
  .max(99_999_999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Price supports at most 2 decimals.");
const registrationPassword = z
  .string()
  .min(1)
  .max(3);
const loginPassword = z
  .string()
  .min(1)
  .max(72)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes.");

export const registerSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3).max(50),
    password: registrationPassword,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(1).max(50),
    password: loginPassword,
  }),
});

export const productCreateSchema = z.object({
  body: z.object({
    pname: z.string().trim().min(1).max(100),
    price,
    quantity: nonnegativeQuantity,
  }),
});

export const productUpdateSchema = z.object({
  params: z.object({ pid: positiveId }),
  body: z
    .object({
      pname: z.string().trim().min(1).max(100).optional(),
      price: price.optional(),
      quantity: nonnegativeQuantity.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "At least one field is required."),
});

export const productIdSchema = z.object({ params: z.object({ pid: positiveId }) });

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          pid: positiveId,
          qty: quantity,
        }),
      )
      .min(1)
      .max(50)
      .refine((items) => new Set(items.map(({ pid }) => pid)).size === items.length, {
        message: "Each product may appear only once.",
      }),
  }),
});

export const orderIdSchema = z.object({ params: z.object({ oid: positiveId }) });

export const shipmentCreateSchema = z.object({
  body: z.object({
    oid: positiveId,
    status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).default("pending"),
  }),
});

export const shipmentStatusSchema = z.object({
  params: z.object({ shipid: positiveId }),
  body: z.object({
    status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
  }),
});
