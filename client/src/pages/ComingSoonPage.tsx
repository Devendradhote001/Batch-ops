import { Hammer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface ComingSoonPageProps {
  title: string;
  description: string;
  phase: number;
}

/** Placeholder for routes whose feature lands in a later build phase. */
export function ComingSoonPage({ title, description, phase }: ComingSoonPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={Hammer} title={`Arrives in Phase ${phase}`} description="The route, navigation and access rules are in place." />
      </Card>
    </>
  );
}
