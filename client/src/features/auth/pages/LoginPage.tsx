import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useCurrentUser, useLogin } from '../api';
import { loginSchema, type LoginValues } from '../schemas';

export function LoginPage() {
  const { data: currentUser } = useCurrentUser();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  useDocumentTitle('Sign in');

  const from = (location.state as { from?: Location } | null)?.from;
  const redirectTo = from ? `${from.pathname}${from.search}` : '/';

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (currentUser) return <Navigate to={redirectTo} replace />;

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => navigate(redirectTo, { replace: true }) });
  });

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-10" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to BatchOps</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Batch and instructor tracking for the vertical.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form noValidate onSubmit={onSubmit} className="space-y-4">
              {login.isError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{getErrorMessage(login.error)}</span>
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

              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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
              <div className="-mt-2 text-right">
                <Link
                  to="/forgot-password"
                  state={{ email: getValues('email') }}
                  className="text-xs font-medium text-accent-700 hover:underline dark:text-accent-300"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" loading={login.isPending}>
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Accounts are created by your admin. Ask them if you need access.
        </p>
      </div>
    </div>
  );
}
