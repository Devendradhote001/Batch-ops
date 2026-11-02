import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useCurrentUser, useRequestPasswordReset } from '../api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';

/**
 * "Forgot password": the request goes to the admin, who sets a temporary password from Admin → Users.
 * No email service needed, and nobody can change a password just by knowing an email address.
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const { data: currentUser } = useCurrentUser();
  const request = useRequestPasswordReset();
  const location = useLocation();
  const prefill = (location.state as { email?: string } | null)?.email ?? '';

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: prefill } });

  if (currentUser) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(({ email }) => request.mutate(email.trim()));

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-10" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Forgot your password?</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your admin will set a temporary password and share it with you.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {request.isSuccess ? (
              <div className="space-y-4 text-center" role="status">
                <MailCheck className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <div className="space-y-1">
                  <p className="font-medium">Request sent</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    If <span className="font-medium text-zinc-700 dark:text-zinc-300">{getValues('email')}</span> has an
                    account, your admin can now see the request. Once they give you a temporary password, sign in and
                    change it from your profile.
                  </p>
                </div>
              </div>
            ) : (
              <form noValidate onSubmit={onSubmit} className="space-y-4">
                {request.isError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{getErrorMessage(request.error)}</span>
                  </div>
                )}
                <Field label="Email" htmlFor="email" error={errors.email?.message}>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@company.com"
                    invalid={!!errors.email}
                    {...register('email')}
                  />
                </Field>
                <Button type="submit" className="w-full" loading={request.isPending}>
                  Request reset
                </Button>
              </form>
            )}
          </CardContent>
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
