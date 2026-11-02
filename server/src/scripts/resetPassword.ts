/**
 * Sets a new password for any account, from the terminal. For when the only admin is locked out.
 * Asks for the email and the new password (typed twice, hidden) — nothing is passed on the command line,
 * so the password never lands in shell history. Signs the account out everywhere.
 */
import { z } from 'zod';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { passwordSchema } from '../modules/auth/auth.schema';
import { User } from '../modules/users/user.model';
import { hashPassword } from '../utils/password';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('That is not a valid email address'));

/** Reads one line from the terminal. With `hidden`, typed characters are not echoed. */
function prompt(question: string, { hidden = false } = {}): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) return Promise.reject(new Error('Run this in an interactive terminal: npm run reset-password'));

  return new Promise((resolve) => {
    let value = '';
    // Turn terminal echo off *before* showing the question, so keys typed the moment it appears aren't shown.
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdout.write(question);

    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      resolve(value);
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(false);
          stdout.write('\nCancelled.\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            if (!hidden) stdout.write('\b \b');
          }
          continue;
        }
        if (ch < ' ') continue;
        value += ch;
        if (!hidden) stdout.write(ch);
      }
    };
    stdin.on('data', onData);
  });
}

async function resetPassword() {
  await connectDB();

  const email = emailSchema.parse(await prompt('Account email: '));
  const user = await User.findOne({ email }).select('+tokenVersion');
  if (!user) throw new Error(`No account with email ${email} in this database.`);
  console.log(`Found ${user.name} (${user.role}${user.isActive ? '' : ', deactivated'}).`);

  const password = await prompt('New password (hidden): ', { hidden: true });
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid password');
  if ((await prompt('Repeat new password: ', { hidden: true })) !== password) throw new Error('Passwords did not match. Nothing was changed.');

  user.passwordHash = await hashPassword(password);
  user.tokenVersion += 1;
  await user.save();

  console.log(`Password updated for ${email}. Any open sessions for this account have been signed out.`);
  if (!user.isActive) console.log('Note: this account is deactivated — reactivate it from Admin → Users before it can sign in.');
  if (env.isProduction) console.log('(Applied to the production database.)');
}

resetPassword()
  .catch((err) => {
    console.error(err instanceof z.ZodError ? (err.issues[0]?.message ?? 'Invalid input') : err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
