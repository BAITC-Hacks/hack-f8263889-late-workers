import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pageNumbers = (total: number, pageSize: number): number[] =>
  Array.from({ length: Math.ceil(total / pageSize) }, (_, index) => index + 1);
