import { getFieldErrors, isApiError } from "@/core/api";
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

  if (isApiError(error) && error.status === 422) {
    const fields = Object.entries(getFieldErrors(error));
    let unknownField = fields.length === 0;
    for (const [name, message] of fields) {
      if (Object.hasOwn(values, name)) {
        setError(name as Path<T>, { type: "server", message });
      } else {
        unknownField = true;
      }
    }
    if (unknownField) setError("root", { type: "server", message: fallback });
    return;
  }

  setError("root", { type: "server", message: fallback });
};
