/**
 * Clock - Time utility module
 * Provides monotonic and wall-clock time operations
 */

export interface Clock {
  nowMs(): number;
  nowUs(): number;
  now(): Date;
  sleep(ms: number): Promise<void>;
  start(): number;
  stop(startTime: number): number;
}

let _clockInstance: Clock | null = null;

/**
 * Get the singleton Clock instance
 */
export function getClock(): Clock {
  if (!_clockInstance) {
    _clockInstance = createClock();
  }
  return _clockInstance;
}

/**
 * Create a new Clock instance
 */
export function createClock(): Clock {
  return {
    nowMs(): number {
      return Date.now();
    },

    nowUs(): number {
      return Math.floor(performance.now() * 1000);
    },

    now(): Date {
      return new Date();
    },

    async sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    start(): number {
      return performance.now();
    },

    stop(startTime: number): number {
      return performance.now() - startTime;
    }
  };
}

export default { getClock, createClock };