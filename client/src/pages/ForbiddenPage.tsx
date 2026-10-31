import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      className="py-24"
      icon={ShieldX}
      title="You don't have access to this page"
      description="Your role doesn't include this area. If you think that's a mistake, ask your admin."
      action={
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      }
    />
  );
}
