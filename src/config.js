import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().min(1).default("1h"),
    CORS_ORIGIN: z.string().default("http://localhost:3001"),
    ADMIN_USERNAME: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
  })
  .superRefine((env, context) => {
    const adminValues = [env.ADMIN_USERNAME, env.ADMIN_PASSWORD];
    if (adminValues.some(Boolean) && !adminValues.every(Boolean)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ADMIN_USERNAME and ADMIN_PASSWORD must be set together.",
      });
    }
    if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 12) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_PASSWORD"],
        message: "ADMIN_PASSWORD must contain at least 12 characters.",
      });
    }
  });

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  throw new Error("Set the required environment variables; see .env.example.");
}

export const env = result.data;
