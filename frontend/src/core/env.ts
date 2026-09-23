import { z } from "zod";

const schema = z.object({
  VITE_API_URL: z.url().default("http://localhost:8000"),
  VITE_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment variables:\n${issues}\n\nCopy .env.example to .env and fill in the required values.`
  );
}

export const env = parsed.data;
export type Env = z.infer<typeof schema>;
