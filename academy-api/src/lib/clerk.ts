import { createClerkClient } from '@clerk/backend';

let _clerk: ReturnType<typeof createClerkClient> | null = null;

export function getClerkClient() {
  if (_clerk) return _clerk;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is required');
  _clerk = createClerkClient({ secretKey });
  return _clerk;
}
