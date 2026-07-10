import { cookies } from 'next/headers';
import { getDictionary, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { listCustomers } from './actions';
import CustomersClient from './view/CustomersClient';

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE) as Locale;
  const dict = getDictionary(locale);

  const { search } = await searchParams;
  const result = await listCustomers(search);
  const customers = result.success ? result.data : [];

  // `count` is a function — it must be called server-side and passed down as
  // a plain string, since functions can't cross into a Client Component prop.
  const { count, ...customersDict } = dict.customers;

  return (
    <CustomersClient
      customers={customers}
      dict={customersDict}
      countLabel={count(customers.length)}
    />
  );
}
