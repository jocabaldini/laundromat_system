import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="mb-3 flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>›</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display" style={{ color: 'var(--text-heading)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
