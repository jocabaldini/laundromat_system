import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import PageHeader from '../../../_components/PageHeader';
import CustomerForm from '../../_components/CustomerForm';
import { getCustomer } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const result = await getCustomer(id);
  if (!result.success) notFound();

  // `count` is a function — it can't be passed as a prop to a Client Component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...customersDict } = dict.customers;

  return (
    <div>
      <PageHeader
        title={dict.customers.editCustomer}
        breadcrumbs={[
          { label: dict.customers.breadcrumbList, href: '/customers' },
          { label: result.data.name },
          { label: dict.customers.breadcrumbEdit },
        ]}
      />
      <CustomerForm customer={result.data} dict={customersDict} />
    </div>
  );
}
