import { LayoutDashboard } from 'lucide-react';
import { ROLE_LABELS } from '@batchops/shared';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthUser } from '@/features/auth/api';
import { greetingIST } from '@/lib/day';

export function DashboardPage() {
  const user = useAuthUser();
  const firstName = user.name.split(' ')[0];

  return (
    <>
      <PageHeader
        title={`${greetingIST()}, ${firstName}`}
        description={`Signed in as ${ROLE_LABELS[user.role].toLowerCase()}. Here's what's happening in the vertical today.`}
      />
      <Card>
        <EmptyState
          icon={LayoutDashboard}
          title="The dashboard arrives in Phase 5"
          description="Today's sessions, active batches, upcoming events and the daily update status will show here."
        />
      </Card>
    </>
  );
}
