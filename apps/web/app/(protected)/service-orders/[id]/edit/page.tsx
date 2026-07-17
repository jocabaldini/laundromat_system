import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import PageHeader from '../../../_components/PageHeader';
import ServiceOrderEditClient from './view/ServiceOrderEditClient';
import { getServiceOrder } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditServiceOrderPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const result = await getServiceOrder(id);
  if (!result.success) notFound();

  // Status label maps — computed server-side (avoids passing dict with functions)
  const statusLabels: Record<string, string> = {
    RECEIVED: dict.serviceOrders.statusReceived,
    WASHING: dict.serviceOrders.statusWashing,
    IRONING: dict.serviceOrders.statusIroning,
    READY: dict.serviceOrders.statusReady,
    DELIVERED: dict.serviceOrders.statusDelivered,
    CANCELLED: dict.serviceOrders.statusCancelled,
  };
  const itemStatusLabels: Record<string, string> = {
    RECEIVED: dict.serviceOrders.itemStatusReceived,
    WASHING: dict.serviceOrders.itemStatusWashing,
    IRONING: dict.serviceOrders.itemStatusIroning,
    READY: dict.serviceOrders.itemStatusReady,
  };

  // `count` is a function — it can't be passed as a prop to a Client Component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...serviceOrdersDict } = dict.serviceOrders;

  return (
    <div>
      <PageHeader
        title={dict.serviceOrders.editOrder}
        breadcrumbs={[
          { label: dict.serviceOrders.breadcrumbList, href: '/service-orders' },
          { label: result.data.customer.name },
          { label: dict.serviceOrders.breadcrumbEdit },
        ]}
      />
      <ServiceOrderEditClient
        order={result.data}
        statusLabels={statusLabels}
        itemStatusLabels={itemStatusLabels}
        dict={serviceOrdersDict}
      />
    </div>
  );
}
