"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeterministicId = generateDeterministicId;
exports.computeSHA256 = computeSHA256;
exports.verifySimulatedSignature = verifySimulatedSignature;
// @mia/core/deterministic - Deterministic ID generation
function generateDeterministicId(prefix) {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 9);
    return prefix ? `${prefix}_${ts}_${rand}` : `${ts}_${rand}`;
}
function computeSHA256(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
function verifySimulatedSignature(data, signature) {
    return computeSHA256(data) === signature;
}
