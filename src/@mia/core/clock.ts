// @mia/core/clock - Clock implementations
export interface Clock {
    now(): number;
    nowMs(): number;
    date(): Date;
}

class SystemClock implements Clock {
    now(): number {
        return Date.now();
    }
    nowMs(): number {
        return Date.now();
    }
    date(): Date {
        return new Date();
    }
}

let clockInstance: Clock = new SystemClock();

export function getClock(): Clock {
    return clockInstance;
}

export function setClock(clock: Clock): void {
    clockInstance = clock;
}
