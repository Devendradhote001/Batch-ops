import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface Email {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

/** Whether the server can send email at all. When false, features fall back to non-email flows. */
export const emailEnabled = !!env.EMAIL_PROVIDER;

const TIMEOUT_MS = 10_000;

let transporter: Transporter | undefined;

/** One pooled SMTP connection, created on first use. */
function smtpTransport(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    pool: true,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS * 2,
  });
  return transporter;
}

/**
 * Sends one email over SMTP with nodemailer (works with Gmail App Passwords or any SMTP provider).
 * The 'log' provider prints the email instead — for local development without an email account.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (env.EMAIL_PROVIDER === 'log') {
    console.log(`\n--- email (EMAIL_PROVIDER=log) ---\nTo: ${email.to.email}\nSubject: ${email.subject}\n\n${email.text}\n---------------------------------\n`);
    return;
  }
  if (env.EMAIL_PROVIDER !== 'smtp') throw new Error('Email is not configured (EMAIL_PROVIDER is unset)');

  await smtpTransport().sendMail({
    from: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_EMAIL ?? env.SMTP_USER! },
    to: email.to.name ? { name: email.to.name, address: email.to.email } : email.to.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

/**
 * Logs on startup whether the SMTP login works, so a wrong password or a host that blocks SMTP shows up in the
 * deploy log instead of as silently missing emails. Never throws.
 */
export async function checkEmailSetup(): Promise<void> {
  if (env.EMAIL_PROVIDER === 'log') {
    console.log('Email: EMAIL_PROVIDER=log — reset emails are printed here, not sent.');
    return;
  }
  if (env.EMAIL_PROVIDER !== 'smtp') {
    console.log('Email: not configured — "forgot password" requests go to an admin.');
    return;
  }
  try {
    await smtpTransport().verify();
    console.log(`Email: SMTP ready (${env.SMTP_USER} via ${env.SMTP_HOST}:${env.SMTP_PORT}).`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(
      `Email: SMTP failed (${env.SMTP_HOST}:${env.SMTP_PORT}) — ${reason}\n` +
        '  Gmail: use an App Password (needs 2-Step Verification), not your normal password.\n' +
        '  A timeout usually means this host blocks outgoing SMTP; try SMTP_PORT=587 or another host/plan.',
    );
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** The password-reset email: one button, the plain link as a fallback, and how long it lasts. */
export function passwordResetEmail({ name, email, link, minutes }: { name: string; email: string; link: string; minutes: number }): Email {
  const safeName = escapeHtml(name);
  return {
    to: { email, name },
    subject: 'Reset your BatchOps password',
    text: [
      `Hi ${name},`,
      '',
      'Someone (hopefully you) asked to reset your BatchOps password. Open this link to choose a new one:',
      link,
      '',
      `The link works once and expires in ${minutes} minutes. If you didn't ask for this, you can ignore this email — your password won't change.`,
    ].join('\n'),
    html: `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#18181b">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px;font-size:16px;font-weight:600">Reset your BatchOps password</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5">Hi ${safeName}, someone (hopefully you) asked to reset your password. Choose a new one here:</p>
      <p style="margin:0 0 20px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px">Set a new password</a></p>
      <p style="margin:0 0 8px;font-size:12px;color:#71717a">The link works once and expires in ${minutes} minutes. If you didn't ask for this, ignore this email — your password won't change.</p>
      <p style="margin:0;font-size:12px;color:#a1a1aa;word-break:break-all">${escapeHtml(link)}</p>
    </td></tr>
  </table>
</body></html>`,
  };
}
