function randomHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createTraceId(): string {
  return randomHex(32);
}

export function createSpanId(): string {
  return randomHex(16);
}
