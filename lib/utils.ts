import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildShareUrl(tabUrl: string, roomId: string): string | null {
  try {
    const url = new URL(tabUrl);
    url.searchParams.delete('liftedSyncRoom');
    url.searchParams.set('liftedSyncRoom', roomId);
    return url.toString();
  } catch (err) {
    console.error('Failed to build share URL:', err);
    return null;
  }
}
