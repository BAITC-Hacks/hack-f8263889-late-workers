import { isApiError } from "@/core/api";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { authResolver } from "../components/formHelpers";
import type { LoginInput } from "../types";
import { validateLogin } from "../validation";
import { useLogin } from "./useLogin";

export const useLoginForm = () => {
  const { t } = useTranslation();
  const mutation = useLogin();
  const form = useForm<LoginInput>({
    defaultValues: { email: "", password: "" },
    resolver: authResolver(validateLogin, t),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ ...values, email: values.email.trim() });
    } catch (error) {
      if (
        isApiError(error) &&
        error.status === 401 &&
        error.code === "INVALID_CREDENTIALS"
      ) {
        form.resetField("password");
        form.setError("root", {
          message: t("auth.errors.invalidCredentials"),
        });
        return;
      }
      form.setError("root", { message: t("auth.errors.loginFailed") });
    }
  });

  return {
    ...form,
    onSubmit,
    pending: mutation.isPending || form.formState.isSubmitting,
  };
};
