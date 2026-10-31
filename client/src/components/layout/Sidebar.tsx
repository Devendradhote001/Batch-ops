import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { useAuthUser } from '@/features/auth/api';
import { cn } from '@/lib/cn';
import { navForRole, type NavSection } from './nav';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const sections = navForRole(useAuthUser().role);

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 md:flex dark:border-zinc-800 dark:bg-zinc-950',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Brand collapsed={collapsed} />
        <SidebarNav sections={sections} collapsed={collapsed} />
        <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(navItemClasses(false), collapsed && 'justify-center px-0')}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between pr-3">
              <Brand collapsed={false} />
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarNav sections={sections} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
      <BrandMark />
      {!collapsed && <span className="text-[15px] font-semibold tracking-tight">BatchOps</span>}
    </div>
  );
}

function navItemClasses(active: boolean) {
  return cn(
    'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
    active
      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-50'
      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100',
  );
}

function SidebarNav({ sections, collapsed }: { sections: NavSection[]; collapsed: boolean }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-3">
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="space-y-0.5">
          {section.title &&
            (collapsed ? (
              <div className="mx-3 mb-2 border-t border-zinc-200 dark:border-zinc-800" />
            ) : (
              <p className="px-3 pb-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">{section.title}</p>
            ))}
          {section.items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) => cn(navItemClasses(isActive), collapsed && 'justify-center px-0')}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('size-4 shrink-0', isActive && 'text-accent-600 dark:text-accent-400')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
