import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  FolderCog,
  Layers,
  LayoutDashboard,
  NotebookPen,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@batchops/shared';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: readonly Role[];
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const ALL: readonly Role[] = ['admin', 'instructor', 'viewer'];

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ALL, end: true },
      { label: 'Batches', to: '/batches', icon: Layers, roles: ALL },
      { label: 'Sessions', to: '/sessions', icon: CalendarClock, roles: ALL },
      { label: 'Daily updates', to: '/updates', icon: NotebookPen, roles: ['admin', 'viewer'] },
      { label: 'Events', to: '/events', icon: CalendarDays, roles: ALL },
      { label: 'Analytics', to: '/analytics', icon: BarChart3, roles: ALL },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Users', to: '/admin/users', icon: Users, roles: ['admin'] },
      { label: 'Manage batches', to: '/admin/batches', icon: FolderCog, roles: ['admin'] },
    ],
  },
];

export function navForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
