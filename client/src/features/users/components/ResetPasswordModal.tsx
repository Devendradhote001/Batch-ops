import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { PublicUser } from '@batchops/shared';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/api';
import { useResetPassword } from '../api';
import { generatePassword, resetPasswordFormSchema } from '../schemas';
import { PasswordField } from './PasswordField';

const FORM_ID = 'reset-password-form';

export function ResetPasswordModal({ user, onClose }: { user: PublicUser | null; onClose: () => void }) {
  const resetPassword = useResetPassword();
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<{ password: string }>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  useEffect(() => {
    if (user) {
      reset({ password: generatePassword() });
      resetPassword.reset();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when (re)opened

  const onSubmit = handleSubmit(({ password }) => {
    if (!user) return;
    resetPassword.mutate(
      { id: user._id, password },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${user.name}`, { description: "They've been signed out everywhere." });
          onClose();
        },
      },
    );
  });

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      size="sm"
      title="Reset password"
      description={user ? `Set a new password for ${user.name}. This signs them out on every device.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={resetPassword.isPending}>
            Reset password
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-3">
        {resetPassword.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(resetPassword.error)}
          </p>
        )}
        <PasswordField
          label="New password"
          registration={register('password')}
          value={watch('password') ?? ''}
          onGenerate={(password) => setValue('password', password, { shouldValidate: true })}
          error={formState.errors.password?.message}
        />
      </form>
    </Modal>
  );
}
