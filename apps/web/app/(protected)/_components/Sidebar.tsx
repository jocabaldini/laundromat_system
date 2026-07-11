'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dictionary } from '@/lib/i18n';

interface SidebarProps {
  dict: Dictionary['sidebar'];
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

export default function Sidebar({ dict }: SidebarProps) {
  const pathname = usePathname();

  const mainItems: NavItem[] = [
    { href: '/dashboard', icon: '📋', label: dict.dashboard },
    { href: '/customers', icon: '👥', label: dict.customers },
    { href: '/service-orders', icon: '🧺', label: dict.serviceOrders },
    { href: '/invoices', icon: '🧾', label: dict.invoices },
  ];

  const systemItems: NavItem[] = [{ href: '/users', icon: '👤', label: dict.users }];

  const settingsItems: NavItem[] = [
    { href: '/settings/service-items', icon: '📦', label: dict.serviceItems },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className="flex w-52 flex-shrink-0 flex-col overflow-y-auto border-r py-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="px-3 mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {dict.menu}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {mainItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition"
            style={
              isActive(item.href)
                ? {
                    color: 'var(--text-heading)',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary-subtle)',
                    borderRight: '3px solid var(--primary)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 mt-4 mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {dict.system}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {systemItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition"
            style={
              isActive(item.href)
                ? {
                    color: 'var(--text-heading)',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary-subtle)',
                    borderRight: '3px solid var(--primary)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 mt-4 mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {dict.settings}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition"
            style={
              isActive(item.href)
                ? {
                    color: 'var(--text-heading)',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary-subtle)',
                    borderRight: '3px solid var(--primary)',
                  }
                : { color: 'var(--text-secondary)' }
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
