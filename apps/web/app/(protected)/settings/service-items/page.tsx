import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { listServiceItems } from './actions';
import ServiceItemsClient from './view/ServiceItemsClient';

export default async function ServiceItemsPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const result = await listServiceItems();
  const items = result.success ? result.data : [];
  const countLabel = dict.serviceItems.count(items.length);

  // `count`/`priceHint` are functions — they can't be passed as props to a
  // Client Component, so they're stripped here and computed server-side instead.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, priceHint, ...serviceItemsDict } = dict.serviceItems;

  return <ServiceItemsClient items={items} countLabel={countLabel} dict={serviceItemsDict} />;
}
