/**
 * Parses a string value as a port number, or returns a fallback if undefined.
 * @param value Port value as string or undefined
 * @param fallback Fallback port number
 * @returns Parsed port number
 */
export const parsePort = (value: string | undefined, fallback: number): number =>
  value ? parseInt(value, 10) : fallback;
