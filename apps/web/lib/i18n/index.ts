import { ptBR } from './locales/pt-BR';
import { enUS } from './locales/en-US';
import type { NextRequest } from 'next/server';

export type Locale = 'pt-BR' | 'en-US';

export type Dictionary = {
  readonly login: {
    readonly title: string;
    readonly subtitle: string;
    readonly email: string;
    readonly emailPlaceholder: string;
    readonly password: string;
    readonly passwordPlaceholder: string;
    readonly submit: string;
    readonly submitting: string;
    readonly errorFallback: string;
  };
  readonly dashboard: {
    readonly title: string;
  };
  readonly navbar: {
    readonly appName: string;
    readonly logout: string;
    readonly loggingOut: string;
  };
  readonly sidebar: {
    readonly menu: string;
    readonly system: string;
    readonly dashboard: string;
    readonly customers: string;
    readonly serviceOrders: string;
    readonly invoices: string;
    readonly users: string;
    readonly settings: string;
    readonly serviceItems: string;
  };
  readonly customers: {
    readonly title: string;
    readonly newCustomer: string;
    readonly editCustomer: string;
    readonly count: (n: number) => string;
    readonly searchPlaceholder: string;
    readonly search: string;
    readonly code: string;
    readonly name: string;
    readonly phone: string;
    readonly email: string;
    readonly address: string;
    readonly actions: string;
    readonly edit: string;
    readonly delete: string;
    readonly save: string;
    readonly cancel: string;
    readonly codeHint: string;
    readonly codeRequired: string;
    readonly suggestCode: string;
    readonly codeAvailable: string;
    readonly codeUnavailable: string;
    readonly deleteConfirm: string;
    readonly deleteConfirmDescription: string;
    readonly confirmDelete: string;
    readonly breadcrumbList: string;
    readonly breadcrumbNew: string;
    readonly breadcrumbEdit: string;
    readonly noResults: string;
  };
  readonly settings: {
    readonly title: string;
    readonly subtitle: string;
  };
  readonly serviceItems: {
    readonly title: string;
    readonly newItem: string;
    readonly editItem: string;
    readonly count: (n: number) => string;
    readonly name: string;
    readonly type: string;
    readonly price: string;
    readonly actions: string;
    readonly edit: string;
    readonly delete: string;
    readonly save: string;
    readonly cancel: string;
    readonly typePorKg: string;
    readonly typePorUnidade: string;
    readonly priceHint: (type: string) => string;
    readonly invalidPrice: string;
    readonly deleteConfirm: string;
    readonly deleteConfirmDescription: string;
    readonly breadcrumbList: string;
    readonly breadcrumbNew: string;
    readonly breadcrumbEdit: string;
    readonly noResults: string;
  };
  readonly serviceOrders: {
    readonly title: string;
    readonly newOrder: string;
    readonly editOrder: string;
    readonly count: (n: number) => string;
    readonly customer: string;
    readonly estimatedDelivery: string;
    readonly observations: string;
    readonly items: string;
    readonly status: string;
    readonly actions: string;
    readonly referenceTotal: string;
    readonly finalTotal: string;
    readonly discount: string;
    readonly item: string;
    readonly itemType: string;
    readonly quantity: string;
    readonly unitPrice: string;
    readonly subtotal: string;
    readonly itemStatus: string;
    readonly itemObservations: string;
    readonly addItem: string;
    readonly removeItem: string;
    readonly save: string;
    readonly cancel: string;
    readonly edit: string;
    readonly delete: string;
    readonly deliver: string;
    readonly cancelOrder: string;
    readonly advanceItemStatus: string;
    readonly statusReceived: string;
    readonly statusWashing: string;
    readonly statusIroning: string;
    readonly statusReady: string;
    readonly statusDelivered: string;
    readonly statusCancelled: string;
    readonly itemStatusReceived: string;
    readonly itemStatusWashing: string;
    readonly itemStatusIroning: string;
    readonly itemStatusReady: string;
    readonly filterStatus: string;
    readonly filterCustomer: string;
    readonly filterDeliveryFrom: string;
    readonly filterDeliveryTo: string;
    readonly filterAll: string;
    readonly clearFilters: string;
    readonly searchCustomerPlaceholder: string;
    readonly noResults: string;
    readonly breadcrumbList: string;
    readonly breadcrumbNew: string;
    readonly breadcrumbEdit: string;
    readonly confirmDeliver: string;
    readonly confirmCancel: string;
    readonly deleteConfirm: string;
    readonly deleteConfirmDescription: string;
    readonly porKg: string;
    readonly porUnidade: string;
    readonly selectCustomer: string;
    readonly selectServiceItem: string;
    readonly itemsRequired: string;
    readonly invalidQuantity: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'en-US'];
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Resolves locale from request: cookie → Accept-Language header → default */
export function getLocaleFromRequest(req: NextRequest): Locale {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (cookie && SUPPORTED_LOCALES.includes(cookie)) return cookie;

  const acceptLanguage = req.headers.get('accept-language') ?? '';
  const browserLocale = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .find((lang) => SUPPORTED_LOCALES.includes(lang as Locale)) as Locale | undefined;

  if (browserLocale) return browserLocale;

  return DEFAULT_LOCALE;
}
