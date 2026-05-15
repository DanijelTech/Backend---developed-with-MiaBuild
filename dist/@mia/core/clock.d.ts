export interface Clock {
    now(): number;
    nowMs(): number;
    date(): Date;
}
export declare function getClock(): Clock;
export declare function setClock(clock: Clock): void;
