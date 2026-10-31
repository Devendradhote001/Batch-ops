import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { nowIST } from '@/lib/day';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const today = nowIST();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-zinc-800 dark:bg-zinc-950/80">
      <Button variant="ghost" size="icon" className="-ml-2 md:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
        <Menu className="size-5" />
      </Button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{today.format('dddd')}</span>
        <span className="hidden sm:inline">, {today.format('D MMMM YYYY')}</span>
        <span className="sm:hidden">, {today.format('D MMM')}</span>
        <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">IST</span>
      </p>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
