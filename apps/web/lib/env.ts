import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.string().url('API_URL must be a valid URL'),
  ACCESS_TOKEN_MAX_AGE: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 604800))
    .refine((v) => !isNaN(v) && v > 0, 'ACCESS_TOKEN_MAX_AGE must be a positive number'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables (Web):');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
