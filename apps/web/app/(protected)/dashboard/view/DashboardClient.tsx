import type { Dictionary } from '@/lib/i18n';

interface DashboardClientProps {
  dict: Dictionary['dashboard'];
}

export default function DashboardClient({ dict }: DashboardClientProps) {
  return (
    <main className="flex flex-1 items-center justify-center min-h-screen bg-gray-950 text-white">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-200">{dict.title}</h1>
    </main>
  );
}
