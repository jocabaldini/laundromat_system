import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import PageHeader from '../../../../_components/PageHeader';
import ServiceItemForm from '../../_components/ServiceItemForm';
import { getServiceItem } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditServiceItemPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const result = await getServiceItem(id);
  if (!result.success) notFound();

  // `count`/`priceHint` are functions — they can't be passed as props to a
  // Client Component. Both possible price hints are precomputed here instead.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, priceHint, ...serviceItemsDict } = dict.serviceItems;
  const priceHints = { POR_KG: priceHint('POR_KG'), POR_UNIDADE: priceHint('POR_UNIDADE') };

  return (
    <div>
      <PageHeader
        title={dict.serviceItems.editItem}
        breadcrumbs={[
          { label: dict.serviceItems.breadcrumbList, href: '/settings/service-items' },
          { label: result.data.name },
          { label: dict.serviceItems.breadcrumbEdit },
        ]}
      />
      <ServiceItemForm item={result.data} priceHints={priceHints} dict={serviceItemsDict} />
    </div>
  );
}
