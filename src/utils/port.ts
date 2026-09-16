/** Parse and validate a TCP port. Throws on NaN or out-of-range values. */
export function normalizePort(value: string | number): number {
  const port = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: received "${value}"`);
  }
  return port;
}
