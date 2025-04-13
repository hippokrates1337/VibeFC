import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names into a single string using clsx and tailwind-merge
 * Useful for conditional and dynamic class names in components
 * 
 * @param inputs - Any number of class value arguments (strings, objects, arrays, etc.)
 * @returns A merged string of class names with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 