import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import PageHeader from '../../_components/PageHeader';
import ServiceOrderForm from '../_components/ServiceOrderForm';
import { listCustomers } from '../../customers/actions';
import { listServiceItems } from '../../settings/service-items/actions';

export default async function NewServiceOrderPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const [customersResult, serviceItemsResult] = await Promise.all([
    listCustomers(),
    listServiceItems(),
  ]);
  const customers = customersResult.success ? customersResult.data : [];
  const serviceItems = serviceItemsResult.success ? serviceItemsResult.data : [];

  // `count` is a function — it can't be passed as a prop to a Client Component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...serviceOrdersDict } = dict.serviceOrders;

  return (
    <div>
      <PageHeader
        title={dict.serviceOrders.newOrder}
        breadcrumbs={[
          { label: dict.serviceOrders.breadcrumbList, href: '/service-orders' },
          { label: dict.serviceOrders.breadcrumbNew },
        ]}
      />
      <ServiceOrderForm
        customers={customers}
        serviceItems={serviceItems}
        dict={serviceOrdersDict}
      />
    </div>
  );
}
