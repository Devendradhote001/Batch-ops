import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AVATAR_COLORS, ROLE_LABELS, ROLES, type PublicUser } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useCreateUser, useUpdateUser } from '../api';
import { createUserFormSchema, generatePassword, userFormSchema, type CreateUserFormValues } from '../schemas';
import { PasswordField } from './PasswordField';

const ROLE_HINTS = {
  admin: 'Full access, including user and batch management.',
  instructor: 'Sees assigned batches and logs their own sessions.',
  viewer: 'Read-only access to everything. For managers.',
} as const;

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Edit this user; omit to create a new one. */
  user?: PublicUser;
  isSelf?: boolean;
}

const FORM_ID = 'user-form';

export function UserFormModal({ open, onClose, user, isSelf }: UserFormModalProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = isEdit ? updateUser : createUser;

  const form = useForm<CreateUserFormValues>({
    // In edit mode the password field isn't rendered, so validate without it.
    resolver: zodResolver(isEdit ? (userFormSchema as unknown as typeof createUserFormSchema) : createUserFormSchema),
  });
  const { register, handleSubmit, reset, control, watch, setValue, formState } = form;
  const { errors } = formState;

  useEffect(() => {
    if (!open) return;
    reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'instructor',
      avatarColor: (user?.avatarColor as CreateUserFormValues['avatarColor']) ?? AVATAR_COLORS[0],
      password: isEdit ? '' : generatePassword(),
    });
    mutation.reset();
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when (re)opened

  const onSubmit = handleSubmit(({ password, ...values }) => {
    const onSuccess = () => {
      toast.success(isEdit ? 'User updated' : `${values.name} can now sign in`);
      onClose();
    };
    if (user) updateUser.mutate({ id: user._id, ...values }, { onSuccess });
    else createUser.mutate({ ...values, password }, { onSuccess });
  });

  const name = watch('name');
  const role = watch('role');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'New user'}
      description={isEdit ? user.email : 'Create an account. There is no public signup.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-4">
        {mutation.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(mutation.error)}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" autoFocus invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="off" invalid={!!errors.email} {...register('email')} />
          </Field>
        </div>

        <Field
          label="Role"
          htmlFor="role"
          error={errors.role?.message}
          hint={isSelf ? "You can't change your own role." : role && ROLE_HINTS[role]}
        >
          {isSelf ? (
            // Not a disabled <select>: RHF drops disabled fields from the submitted values.
            <Input id="role" value={ROLE_LABELS[role]} readOnly className="bg-zinc-50 dark:bg-zinc-800/50" />
          ) : (
            <Select id="role" {...register('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Avatar colour">
          <Controller
            control={control}
            name="avatarColor"
            render={({ field }) => (
              <div className="flex flex-wrap items-center gap-2">
                <Avatar name={name || '?'} color={field.value} />
                <div className="ml-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Avatar colour">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={field.value === color}
                      aria-label={color}
                      onClick={() => field.onChange(color)}
                      className={cn(
                        'size-6 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-900',
                        field.value === color ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          />
        </Field>

        {!isEdit && (
          <PasswordField
            label="Temporary password"
            registration={register('password')}
            value={watch('password') ?? ''}
            onGenerate={(password) => setValue('password', password, { shouldValidate: true })}
            error={errors.password?.message}
          />
        )}
      </form>
    </Modal>
  );
}
