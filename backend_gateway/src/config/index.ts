import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load root or local .env
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MONGO_URI: z.string().default("mongodb://localhost:27017/change_impact_engine"),
  INTELLIGENCE_SERVICE_URL: z.string().default("http://localhost:8000"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().default("development-webhook-secret-token"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
