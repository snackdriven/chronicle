/**
 * Utility functions for className merging and conditional classes
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS deduplication
 *
 * @example
 * cn('px-4 py-2', 'px-6') // => 'px-6 py-2'
 * cn('text-red-500', condition && 'text-blue-500') // => 'text-blue-500' (if condition is true)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
