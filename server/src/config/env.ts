import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ADMIN_NAME: z.string().default('Vertical Lead'),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  /** Serve the built client (client/dist) from this server. Default: whenever a build exists. */
  SERVE_CLIENT: z.enum(['true', 'false']).optional(),
  /**
   * How password-reset emails are sent: 'brevo' (HTTPS API) or 'log' (print to the server log, for local dev).
   * Unset = no email; "forgot password" requests then go to an admin instead.
   */
  EMAIL_PROVIDER: z.enum(['brevo', 'log']).optional(),
  BREVO_API_KEY: z.string().optional(),
  MAIL_FROM_EMAIL: z.string().optional(),
  MAIL_FROM_NAME: z.string().default('BatchOps'),
  /** Public URL of the web app, used in emailed links. Defaults to the first CLIENT_ORIGIN. */
  APP_URL: z.url().optional(),
})
  .refine(
    (e) => e.NODE_ENV !== 'production' || ![e.JWT_ACCESS_SECRET, e.JWT_REFRESH_SECRET].some((s) => s.startsWith('replace-with')),
    { path: ['JWT_ACCESS_SECRET'], message: 'Set real JWT secrets in production (openssl rand -base64 48)' },
  )
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    path: ['JWT_REFRESH_SECRET'],
    message: 'Access and refresh secrets must differ',
  })
  .refine((e) => e.EMAIL_PROVIDER !== 'brevo' || (e.BREVO_API_KEY && e.MAIL_FROM_EMAIL), {
    path: ['BREVO_API_KEY'],
    message: 'EMAIL_PROVIDER=brevo needs BREVO_API_KEY and MAIL_FROM_EMAIL (a sender verified in Brevo)',
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  /** 'auto' serves client/dist when it has been built, so a host missing NODE_ENV still gets the website. */
  serveClient: parsed.data.SERVE_CLIENT === undefined ? ('auto' as const) : parsed.data.SERVE_CLIENT === 'true',
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
  /** Base URL for links in emails, without a trailing slash. */
  appUrl: (parsed.data.APP_URL ?? parsed.data.CLIENT_ORIGIN.split(',')[0].trim()).replace(/\/+$/, ''),
};
