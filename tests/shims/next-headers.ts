import { AsyncLocalStorage } from "node:async_hooks";

/** Test replacement for `next/headers`: request-scoped cookies and headers via AsyncLocalStorage. */

export type RequestContextInit = { cookies?: Record<string, string>; headers?: Record<string, string> | Headers };
type RequestContext = { cookies: Map<string, string>; headers: Headers };

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(init: RequestContextInit | undefined, fn: () => T): T {
  const context: RequestContext = {
    cookies: new Map(Object.entries(init?.cookies ?? {})),
    headers: init?.headers instanceof Headers ? init.headers : new Headers(init?.headers ?? {}),
  };
  return storage.run(context, fn);
}

export async function cookies() {
  const map = storage.getStore()?.cookies ?? new Map<string, string>();
  return {
    get: (name: string) => (map.has(name) ? { name, value: map.get(name)! } : undefined),
    getAll: () => Array.from(map, ([name, value]) => ({ name, value })),
    has: (name: string) => map.has(name),
    set: (name: string, value: string) => { map.set(name, value); },
    delete: (name: string) => { map.delete(name); },
  };
}

export async function headers() {
  return storage.getStore()?.headers ?? new Headers();
}
