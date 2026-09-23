import { inlineLink } from "@/common/styles";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AuthField } from "../components/AuthField";
import { AuthForm } from "../components/AuthForm";
import { AuthFormShell } from "../components/AuthFormShell";
import { useLoginForm } from "../hooks/useLoginForm";

export const LoginPage = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
    onSubmit,
    pending,
  } = useLoginForm();
  return (
    <AuthFormShell
      title={t("auth.login.title")}
      description={t("auth.login.description")}
    >
      <AuthForm
        onSubmit={onSubmit}
        pending={pending}
        error={errors.root?.message}
        action="login"
      >
        <AuthField
          id="email"
          label={t("auth.form.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          id="password"
          label={t("auth.form.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
      </AuthForm>
      <div className="mt-6 flex flex-col items-start gap-3 border-t pt-6">
        <Link to="/register/business" className={inlineLink}>
          {t("auth.login.businessLink")}
        </Link>
        <Link to="/register/student" className={inlineLink}>
          {t("auth.login.studentLink")}
        </Link>
      </div>
    </AuthFormShell>
  );
};
