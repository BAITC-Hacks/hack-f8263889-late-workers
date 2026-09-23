import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { authResolver, showFormError } from "../components/formHelpers";
import type { RegisterBusinessInput } from "../types";
import { normalizeBusinessInput, validateBusiness } from "../validation";
import { useRegisterBusiness } from "./useRegister";

export const useBusinessRegisterForm = () => {
  const { t } = useTranslation();
  const mutation = useRegisterBusiness();
  const form = useForm<RegisterBusinessInput>({
    defaultValues: {
      email: "",
      password: "",
      companyName: "",
      contactName: "",
      contactPhone: "",
    },
    resolver: authResolver(validateBusiness, t),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(normalizeBusinessInput(values));
    } catch (error) {
      showFormError(
        error,
        form.setError,
        values,
        t("auth.errors.registerFailed"),
        true
      );
    }
  });

  return {
    ...form,
    onSubmit,
    pending: mutation.isPending || form.formState.isSubmitting,
  };
};
