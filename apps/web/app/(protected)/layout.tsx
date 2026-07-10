import AppLayout from './_components/AppLayout';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
