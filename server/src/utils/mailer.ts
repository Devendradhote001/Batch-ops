import { env } from '../config/env';

export interface Email {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

/** Whether the server can send email at all. When false, features fall back to non-email flows. */
export const emailEnabled = !!env.EMAIL_PROVIDER;

const SEND_TIMEOUT_MS = 10_000;

/**
 * Sends one email. Brevo is used over its HTTPS API (not SMTP), which works on hosts that block SMTP ports.
 * The 'log' provider prints the email instead — for local development without an email account.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (env.EMAIL_PROVIDER === 'log') {
    console.log(`\n--- email (EMAIL_PROVIDER=log) ---\nTo: ${email.to.email}\nSubject: ${email.subject}\n\n${email.text}\n---------------------------------\n`);
    return;
  }
  if (env.EMAIL_PROVIDER !== 'brevo') throw new Error('Email is not configured (EMAIL_PROVIDER is unset)');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: env.MAIL_FROM_EMAIL, name: env.MAIL_FROM_NAME },
      to: [email.to],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo rejected the email (${response.status}): ${detail.slice(0, 300)}`);
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
