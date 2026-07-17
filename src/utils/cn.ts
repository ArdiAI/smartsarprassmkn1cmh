import { cls } from './cls';

export function cn(...inputs: Parameters<typeof cls>) {
  return cls(...inputs);
}
