import { applyFieldErrors } from "@/common/lib/forms";
import { isApiError } from "@/core/api";
import type { TFunction } from "i18next";
import type {
  FieldErrors,
  FieldValues,
  Path,
  Resolver,
  UseFormSetError,
} from "react-hook-form";

import type { ValidationErrors } from "../validation";

export const authResolver =
  <T extends FieldValues>(
    validate: (values: T) => ValidationErrors<T>,
    t: TFunction
  ): Resolver<T> =>
  (values) => {
    const issues = Object.entries(validate(values));
    const errors = Object.fromEntries(
      issues.map(([name, key]) => [
        name,
        { type: "validate", message: t(`auth.errors.${key}`) },
      ])
    ) as FieldErrors<T>;
    return issues.length > 0 ? { values: {}, errors } : { values, errors: {} };
  };

export const showFormError = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  values: T,
  fallback: string,
  registration = false
) => {
  if (registration && isApiError(error) && error.status === 409) {
    setError("email" as Path<T>, { type: "server", message: error.message });
    return;
  }

  if (!applyFieldErrors(error, setError, values))
    setError("root", { type: "server", message: fallback });
};
