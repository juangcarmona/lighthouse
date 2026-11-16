// JSON encoding is distinct from the unchanged Product Change text-content limits.
// Keep the Product Change envelope within the existing Actions artifact member bound.
export const PRODUCT_ENVELOPE_BYTES = 2 * 1024 * 1024;
export function engineResultByteLimit(request) {
  return request.worker === 'product-change' ? PRODUCT_ENVELOPE_BYTES : 128000;
}
