// @mia/core/deterministic - Deterministic ID generation
export function generateDeterministicId(prefix?: string): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 9);
    return prefix ? `${prefix}_${ts}_${rand}` : `${ts}_${rand}`;
}

export function computeSHA256(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

export function verifySimulatedSignature(data: string, signature: string): boolean {
    return computeSHA256(data) === signature;
}
