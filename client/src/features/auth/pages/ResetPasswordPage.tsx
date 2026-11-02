import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { getErrorCode, getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useResetPasswordWithToken } from '../api';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

/** Landing page for the emailed reset link: /reset-password?token=… */
export function ResetPasswordPage() {
  useDocumentTitle('Set a new password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const reset = useResetPasswordWithToken();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });

  const linkIsBad = !/^[A-Za-z0-9_-]{32,128}$/.test(token) || getErrorCode(reset.error) === 'INVALID_RESET_LINK';
  const onSubmit = handleSubmit(({ password }) => reset.mutate({ token, password }));

  let body;
  if (reset.isSuccess) {
    body = (
      <div className="space-y-4 text-center" role="status">
        <CheckCircle2 className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Password updated</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">You've been signed out everywhere. Sign in with your new password.</p>
        </div>
        <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
          Go to sign in
        </Button>
      </div>
    );
  } else if (linkIsBad) {
    body = (
      <div className="space-y-4 text-center" role="alert">
        <LinkIcon className="mx-auto size-8 text-zinc-400" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">This link has expired or was already used</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Reset links work once and last 30 minutes. Request a new one.</p>
        </div>
        <Button className="w-full" onClick={() => navigate('/forgot-password', { replace: true })}>
          Send a new link
        </Button>
      </div>
    );
  } else {
    body = (
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {reset.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{getErrorMessage(reset.error)}</span>
          </div>
        )}
        <Field label="New password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters.">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              className="pr-10"
              invalid={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>
        <Button type="submit" className="w-full" loading={reset.isPending}>
          Set new password
        </Button>
      </form>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-10" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Set a new password</h1>
        </div>
        <Card>
          <CardContent className="p-6">{body}</CardContent>
        </Card>
        <p className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
