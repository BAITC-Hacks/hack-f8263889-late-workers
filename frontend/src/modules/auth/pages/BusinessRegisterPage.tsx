import { FormField } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import { AuthForm } from "../components/AuthForm";
import { AuthFormShell } from "../components/AuthFormShell";
import { RegistrationLinks } from "../components/RegistrationLinks";
import { useBusinessRegisterForm } from "../hooks/useBusinessRegisterForm";

export const BusinessRegisterPage = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
    onSubmit,
    pending,
  } = useBusinessRegisterForm();
  return (
    <AuthFormShell
      title={t("auth.register.businessTitle")}
      description={t("auth.register.businessDescription")}
    >
      <AuthForm
        onSubmit={onSubmit}
        pending={pending}
        error={errors.root?.message}
        action="register"
      >
        <FormField
          id="email"
          label={t("auth.form.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label={t("auth.form.password")}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          id="companyName"
          label={t("auth.form.companyName")}
          autoComplete="organization"
          error={errors.companyName?.message}
          {...register("companyName")}
        />
        <FormField
          id="contactName"
          label={t("auth.form.contactName")}
          autoComplete="name"
          error={errors.contactName?.message}
          {...register("contactName")}
        />
        <FormField
          id="contactPhone"
          label={t("auth.form.contactPhone")}
          type="tel"
          autoComplete="tel"
          error={errors.contactPhone?.message}
          {...register("contactPhone")}
        />
      </AuthForm>
      <RegistrationLinks role="business" />
    </AuthFormShell>
  );
};
