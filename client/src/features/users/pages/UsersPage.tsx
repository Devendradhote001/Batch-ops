import { KeyRound, Pencil, Plus, Power, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS, ROLES, type PublicUser } from '@batchops/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { useAuthUser } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api';
import { dayjs } from '@/lib/day';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { useSetUserStatus, useUsers } from '../api';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { UserFormModal } from '../components/UserFormModal';

const FILTER_KEYS = ['q', 'role', 'status'] as const;

const ROLE_TONES: Record<PublicUser['role'], BadgeTone> = { admin: 'accent', instructor: 'neutral', viewer: 'neutral' };

export function UsersPage() {
  const me = useAuthUser();
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const users = useUsers(filters);
  const setStatus = useSetUserStatus();

  const [formState, setFormState] = useState<{ open: boolean; user?: PublicUser }>({ open: false });
  const [resetFor, setResetFor] = useState<PublicUser | null>(null);
  const [statusFor, setStatusFor] = useState<PublicUser | null>(null);

  const hasFilters = !!(filters.q || filters.role || filters.status);

  const toggleStatus = () => {
    if (!statusFor) return;
    setStatus.mutate(
      { id: statusFor._id, isActive: !statusFor.isActive },
      {
        onSuccess: (user) => {
          toast.success(user.isActive ? `${user.name} reactivated` : `${user.name} deactivated`);
          setStatusFor(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const columns: Column<PublicUser>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (u) => (
        <div className="flex min-w-48 items-center gap-3">
          <Avatar name={u.name} color={u.avatarColor} />
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              {u.name}
              {u._id === me._id && <span className="ml-1.5 text-xs font-normal text-zinc-400">(you)</span>}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (u) => <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge> },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Deactivated</Badge>),
    },
    {
      key: 'lastLogin',
      header: 'Last sign-in',
      className: 'hidden md:table-cell',
      cell: (u) => (
        <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">
          {u.lastLoginAt ? dayjs(u.lastLoginAt).fromNow() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'w-0 text-right',
      cell: (u) => {
        const isSelf = u._id === me._id;
        return (
          <div className="flex justify-end gap-0.5">
            <Button variant="ghost" size="icon-sm" title="Edit" aria-label={`Edit ${u.name}`} onClick={() => setFormState({ open: true, user: u })}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title={isSelf ? 'Change your password from Profile' : 'Reset password'}
              aria-label={`Reset password for ${u.name}`}
              disabled={isSelf}
              onClick={() => setResetFor(u)}
            >
              <KeyRound className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title={isSelf ? "You can't deactivate yourself" : u.isActive ? 'Deactivate' : 'Reactivate'}
              aria-label={`${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.name}`}
              disabled={isSelf}
              onClick={() => setStatusFor(u)}
              className={u.isActive ? 'hover:text-red-600 dark:hover:text-red-400' : undefined}
            >
              <Power className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts for instructors and viewers. Deactivated users keep their history."
        actions={
          <Button onClick={() => setFormState({ open: true })}>
            <Plus className="size-4" /> New user
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={filters.q}
          onChange={(q) => setFilters({ q })}
          placeholder="Search name or email"
          className="sm:max-w-xs sm:flex-1"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={filters.role} onChange={(e) => setFilters({ role: e.target.value })} aria-label="Filter by role" wrapperClassName="sm:w-40">
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Filter by status" wrapperClassName="sm:w-40">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={users.data?.items}
        getRowId={(u) => u._id}
        isLoading={users.isPending}
        error={users.error}
        onRetry={() => users.refetch()}
        rowClassName={(u) => (u.isActive ? undefined : 'opacity-60')}
        empty={
          hasFilters ? (
            <EmptyState
              icon={Users}
              title="No users match these filters"
              action={
                <Button variant="secondary" size="sm" onClick={() => setFilters({ q: '', role: '', status: '' })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No users yet"
              description="Add your co-instructors and your manager so they can sign in."
              action={<Button onClick={() => setFormState({ open: true })}>Add the first user</Button>}
            />
          )
        }
        footer={<Pagination meta={users.data?.meta} onPageChange={(page) => setFilters({ page })} />}
      />

      <UserFormModal
        open={formState.open}
        user={formState.user}
        isSelf={formState.user?._id === me._id}
        onClose={() => setFormState({ open: false })}
      />
      <ResetPasswordModal user={resetFor} onClose={() => setResetFor(null)} />
      <ConfirmDialog
        open={!!statusFor}
        onClose={() => setStatusFor(null)}
        onConfirm={toggleStatus}
        loading={setStatus.isPending}
        tone={statusFor?.isActive ? 'danger' : 'primary'}
        title={statusFor?.isActive ? `Deactivate ${statusFor.name}?` : `Reactivate ${statusFor?.name}?`}
        confirmLabel={statusFor?.isActive ? 'Deactivate' : 'Reactivate'}
        description={
          statusFor?.isActive
            ? "They'll be signed out immediately and won't be able to sign in. Their sessions, batches and history stay intact."
            : 'They will be able to sign in again with their existing password.'
        }
      />
    </>
  );
}
