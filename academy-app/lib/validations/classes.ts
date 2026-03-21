import { z } from 'zod';

// No body needed for reserve/waitlist/cancel — params come from URL
// But we export types for clarity

export const reserveClassSchema = z.object({});
export const waitlistSchema = z.object({});

export type ReserveClassInput = z.infer<typeof reserveClassSchema>;
export type WaitlistInput = z.infer<typeof waitlistSchema>;
