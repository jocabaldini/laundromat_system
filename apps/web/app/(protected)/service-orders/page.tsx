import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { listServiceOrders } from './actions';
import ServiceOrdersClient from './view/ServiceOrdersClient';

interface Props {
  searchParams: Promise<{
    customerId?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ServiceOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const result = await listServiceOrders({
    customerId: params.customerId,
    status: params.status,
    estimatedDeliveryFrom: params.from,
    estimatedDeliveryTo: params.to,
  });

  const orders = result.success ? result.data : [];
  const countLabel = dict.serviceOrders.count(orders.length);

  // Status labels map — computed server-side (avoids passing dict with functions)
  const statusLabels: Record<string, string> = {
    RECEIVED: dict.serviceOrders.statusReceived,
    WASHING: dict.serviceOrders.statusWashing,
    IRONING: dict.serviceOrders.statusIroning,
    READY: dict.serviceOrders.statusReady,
    DELIVERED: dict.serviceOrders.statusDelivered,
    CANCELLED: dict.serviceOrders.statusCancelled,
  };

  // `count` is a function — it can't be passed as a prop to a Client Component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...serviceOrdersDict } = dict.serviceOrders;

  return (
    <ServiceOrdersClient
      orders={orders}
      countLabel={countLabel}
      statusLabels={statusLabels}
      filters={{
        customerId: params.customerId,
        status: params.status,
        from: params.from,
        to: params.to,
      }}
      dict={serviceOrdersDict}
    />
  );
}
