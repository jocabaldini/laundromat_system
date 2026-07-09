import type { Dictionary } from '@/lib/i18n';

interface DashboardClientProps {
  dict: Dictionary['dashboard'];
}

export default function DashboardClient({ dict }: DashboardClientProps) {
  return (
    <main
      className="flex flex-1 min-h-screen items-center justify-center px-6 py-10"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <div
        className="rounded-3xl px-8 py-12 max-w-lg w-full"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
        }}
      >
        <h1 className="text-3xl font-bold font-display" style={{ color: 'var(--text-heading)' }}>
          {dict.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Bem-vindo ao painel de controle da Lavanderia Visconde. Use a navegação para acessar
          clientes, ordens de serviço e notas fiscais.
        </p>
      </div>
    </main>
  );
}
