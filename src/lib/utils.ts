// Utility function to merge class names using clsx and tailwind-merge
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
//cn first combines class names using clsx, which handles conditional logic and deduplication, then passes the result through twMerge to ensure Tailwind classes are merged correctly without conflicts. This allows for clean and efficient dynamic styling in React components.