export const NEST_ROUTES = {
  health: '/health',

  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },

  users: {
    list: '/users',
    create: '/users',
    findOne: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    remove: (id: string) => `/users/${id}`,
  },

  customers: {
    list: '/customers',
    create: '/customers',
    findOne: (id: string) => `/customers/${id}`,
    update: (id: string) => `/customers/${id}`,
    remove: (id: string) => `/customers/${id}`,
    findByCode: (code: string) => `/customers/code/${code}`,
    checkAvailability: (code: string) => `/customers/code/${code}/availability`,
    suggestCode: (name: string) => `/customers/suggest-code?name=${encodeURIComponent(name)}`,
  },

  serviceOrders: {
    list: '/service-orders',
    create: '/service-orders',
    findOne: (id: string) => `/service-orders/${id}`,
    updateStatus: (id: string) => `/service-orders/${id}/status`,
    remove: (id: string) => `/service-orders/${id}`,
  },

  serviceItems: {
    list: '/service-items',
    create: '/service-items',
    findOne: (id: string) => `/service-items/${id}`,
    update: (id: string) => `/service-items/${id}`,
    remove: (id: string) => `/service-items/${id}`,
  },

  invoices: {
    list: '/invoices',
    findOne: (id: string) => `/invoices/${id}`,
    generate: (serviceOrderId: string) => `/service-orders/${serviceOrderId}/invoice`,
    download: (id: string) => `/invoices/${id}/pdf`,
  },
} as const;
