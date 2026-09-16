import { setTimeout as delay } from 'node:timers/promises';

/** Resolve after `ms` milliseconds. Non-positive values resolve on the next tick. */
export function sleep(ms: number): Promise<void> {
  return delay(Math.max(0, ms));
}
