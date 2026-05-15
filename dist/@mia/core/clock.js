"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClock = getClock;
exports.setClock = setClock;
class SystemClock {
    now() {
        return Date.now();
    }
    nowMs() {
        return Date.now();
    }
    date() {
        return new Date();
    }
}
let clockInstance = new SystemClock();
function getClock() {
    return clockInstance;
}
function setClock(clock) {
    clockInstance = clock;
}
