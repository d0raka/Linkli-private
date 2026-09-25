export function createFakeR2() {
  const objects = new Map<string, Uint8Array>();
  return {
    async put(key: string, value: ArrayBuffer | ArrayBufferView | Uint8Array) {
      const bytes = value instanceof Uint8Array
        ? value
        : value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      objects.set(key, bytes);
    },
    async get(key: string) {
      const body = objects.get(key);
      return body ? { body } : null;
    },
    async delete(key: string) {
      objects.delete(key);
    },
  };
}
