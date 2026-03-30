import { z } from 'zod';

export const reserveClassSchema = z.object({});
export const waitlistSchema = z.object({});

export type ReserveClassInput = z.infer<typeof reserveClassSchema>;
export type WaitlistInput = z.infer<typeof waitlistSchema>;
