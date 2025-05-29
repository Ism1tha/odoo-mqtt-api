export const parsePort = (value: string | undefined, fallback: number): number =>
  value ? parseInt(value, 10) : fallback;
