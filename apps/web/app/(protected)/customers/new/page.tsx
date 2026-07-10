import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import PageHeader from '../../_components/PageHeader';
import CustomerForm from '../_components/CustomerForm';

export default async function NewCustomerPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);
  // `count` is a function — it can't be passed as a prop to a Client Component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...customersDict } = dict.customers;

  return (
    <div>
      <PageHeader
        title={dict.customers.newCustomer}
        breadcrumbs={[
          { label: dict.customers.breadcrumbList, href: '/customers' },
          { label: dict.customers.breadcrumbNew },
        ]}
      />
      <CustomerForm dict={customersDict} />
    </div>
  );
}
