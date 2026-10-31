import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export function NotFoundPage() {
  const navigate = useNavigate();
  useDocumentTitle('Not found');
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button variant="secondary" onClick={() => navigate('/')}>
            Go to dashboard
          </Button>
        }
      />
    </div>
  );
}
