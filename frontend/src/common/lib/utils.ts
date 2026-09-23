import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pageNumbers = (total: number, pageSize: number): number[] =>
  Array.from({ length: Math.ceil(total / pageSize) }, (_, index) => index + 1);

/** `aria-describedby` for a field with an optional `${id}-hint` and `${id}-error`. */
export const describedBy = (id: string, hint: unknown, error: unknown) =>
  [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;
