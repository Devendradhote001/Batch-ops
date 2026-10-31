import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { usePersistentState } from '@/lib/usePersistentState';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [collapsed, setCollapsed] = usePersistentState('bo-sidebar-collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const navigation = useNavigation();

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-zinc-900"
      >
        Skip to content
      </a>
      {/* Shown while the next page's code is loading. */}
      <div
        aria-hidden
        className={cn(
          'fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent-500 transition-transform duration-500',
          navigation.state === 'loading' ? 'scale-x-75' : 'scale-x-0 duration-150',
        )}
      />
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'md:pl-16' : 'md:pl-60')}>
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
