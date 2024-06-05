/**
 * Normalize a port into a number, string, or false.
 */
export async function normalizePort(val: string | number): Promise<number> {
  const port = typeof val === 'string' ? parseInt(val, 10) : val;

  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Port specified is not valid! RECEIVED ${port}`);
  }

  // port number
  return port;
}
