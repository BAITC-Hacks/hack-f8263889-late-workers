import { getFieldErrors, isApiError } from "@/core/api";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/**
 * Puts a 422's `fields` under the matching inputs. Returns `false` when the
 * error is something else or names no known field, so the caller can show
 * its form-level message.
 */
export const applyFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  /** Only these keys count as fields; others fall back to the form message. */
  values: object
): boolean => {
  if (!isApiError(error) || error.status !== 422) return false;
  const fields = Object.entries(getFieldErrors(error));
  let known = fields.length > 0;
  for (const [name, message] of fields) {
    if (Object.hasOwn(values, name)) {
      setError(name as Path<T>, { type: "server", message });
    } else {
      known = false;
    }
  }
  return known;
};

type Validate<T> = (values: T) => Partial<Record<keyof T, string>>;

/** react-hook-form resolver over a pure validator that returns i18n keys. */
export const translatedResolver =
  <T extends FieldValues>(validate: Validate<T>, t: (key: string) => string) =>
  (values: T) => {
    const issues = Object.entries(validate(values)) as [string, string][];
    if (issues.length === 0) return { values, errors: {} };
    return {
      values: {},
      errors: Object.fromEntries(
        issues.map(([name, key]) => [
          name,
          { type: "validate", message: t(key) },
        ])
      ),
    };
  };
