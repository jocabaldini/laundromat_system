import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import DashboardClient from './view/DashboardClient';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  return <DashboardClient dict={dict.dashboard} />;
}
