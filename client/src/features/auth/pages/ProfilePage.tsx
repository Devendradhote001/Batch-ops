import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { getErrorCode, getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/day';
import { useAuthUser, useChangePassword } from '../api';
import { changePasswordSchema, type ChangePasswordValues } from '../schemas';

export function ProfilePage() {
  const user = useAuthUser();

  return (
    <>
      <PageHeader title="Profile" description="Your account details and password." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="self-start">
          <CardContent className="flex items-center gap-4">
            <Avatar name={user.name} color={user.avatarColor} size="lg" />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{user.name}</p>
                <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge>
              </div>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
              {user.lastLoginAt && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Last sign-in {formatDateTime(user.lastLoginAt)}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <ChangePasswordCard />
      </div>
    </>
  );
}

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit((values) => {
    changePassword.mutate(values, {
      onSuccess: () => {
        reset();
        toast.success('Password updated', { description: 'Other devices have been signed out.' });
      },
      onError: (error) => {
        if (getErrorCode(error) === 'INVALID_PASSWORD') {
          setError('currentPassword', { message: getErrorMessage(error) });
        } else {
          toast.error(getErrorMessage(error));
        }
      },
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Changing your password signs you out everywhere else.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={onSubmit} className="space-y-4">
          <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="At least 8 characters.">
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.newPassword}
                {...register('newPassword')}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={changePassword.isPending}>
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
