import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { getMe } from '../dashboard/actions';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Server component — fetches user and locale, renders the full app shell.
// All protected pages use this layout instead of rendering Navbar individually.
export default async function AppLayout({ children }: AppLayoutProps) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);
  const user = await getMe();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
      <Navbar userName={user?.name ?? ''} dict={dict.navbar} currentLocale={locale} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar dict={dict.sidebar} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
