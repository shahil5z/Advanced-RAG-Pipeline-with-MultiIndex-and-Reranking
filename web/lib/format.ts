export function metric(value: number): string {
  return value.toFixed(3);
}

export function millis(value: number): string {
  return `${value.toFixed(1)} ms`;
}
