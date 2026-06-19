import { AsyncLocalStorage } from 'async_hooks';

// Holds per-request data propagated through the async call chain.
// AsyncLocalStorage ensures the context is available in any async operation
// triggered within the same request — services, guards, interceptors, etc.
export interface RequestContext {
  requestId: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

// Returns the current request context, or undefined if called outside a request.
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
