import { Footer, Page, Section, Stack } from "@/common/components/layout";
import { Card } from "@/common/components/ui";
import {
  field,
  fieldError,
  fieldLabel,
  inlineLink,
  pageDescription,
  pageTitle,
  prose,
} from "@/common/styles";
import { getErrorMessage, getFieldErrors } from "@/core/api";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLogin } from "../hooks/useLogin";

type LoginFormValues = {
  email: string;
  password: string;
};

/** Fields the form actually renders — server 422 errors for anything else go to root. */
const FORM_FIELDS = new Set<string>(["email", "password"]);

/** Set by RequireAuth so we can send the user back where they were headed. */
type FromState = { from?: { pathname?: string } } | null;

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const from = (location.state as FromState)?.from?.pathname ?? "/notes";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
      onError: (err) => {
        // 422 → per-field messages; anything else (401, network, or a 422
        // pointing at a field we don't render) → root line.
        const fieldErrors = Object.entries(getFieldErrors(err)).filter(
          ([name]) => FORM_FIELDS.has(name)
        );
        if (fieldErrors.length === 0) {
          setError("root", {
            message: getErrorMessage(err, t("auth.errors.generic")),
          });
          return;
        }
        fieldErrors.forEach(([name, message]) =>
          setError(name as keyof LoginFormValues, { message })
        );
      },
    });
  };

  return (
    <Page>
      <Section divider={false}>
        <Stack gap="lg" className={prose}>
          <Link to="/" className={inlineLink}>
            <ArrowLeft className="h-3 w-3" />
            {t("goHome")}
          </Link>
          <h1 className={pageTitle}>{t("auth.login.title")}</h1>
          <p className={pageDescription}>{t("auth.login.description")}</p>
        </Stack>
      </Section>

      <Section title={t("auth.login.sectionTitle")} delay={0.1}>
        <Card className="max-w-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <Stack gap="xs">
              <label className={fieldLabel}>{t("auth.form.email")}</label>
              <input
                type="email"
                autoComplete="email"
                className={field}
                aria-invalid={!!errors.email}
                placeholder={t("auth.form.emailPlaceholder")}
                {...register("email", {
                  required: t("auth.errors.emailRequired"),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t("auth.errors.emailInvalid"),
                  },
                })}
              />
              {errors.email && (
                <p className={fieldError}>{errors.email.message}</p>
              )}
            </Stack>

            <Stack gap="xs">
              <label className={fieldLabel}>{t("auth.form.password")}</label>
              <input
                type="password"
                autoComplete="current-password"
                className={field}
                aria-invalid={!!errors.password}
                placeholder={t("auth.form.passwordPlaceholder")}
                {...register("password", {
                  required: t("auth.errors.passwordRequired"),
                  minLength: {
                    value: 8,
                    message: t("auth.errors.passwordTooShort"),
                  },
                })}
              />
              {errors.password && (
                <p className={fieldError}>{errors.password.message}</p>
              )}
            </Stack>

            {errors.root && <p className={fieldError}>{errors.root.message}</p>}

            <div className="flex items-center justify-between pt-2">
              <p className="text-muted-foreground text-xs">
                {t("auth.login.noAccount")}{" "}
                <Link
                  to="/register"
                  className="text-primary transition-opacity hover:opacity-80"
                >
                  {t("auth.login.registerCta")}
                </Link>
              </p>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="group text-primary inline-flex items-center gap-2 text-sm font-medium transition-opacity disabled:opacity-50"
              >
                {loginMutation.isPending
                  ? t("auth.login.submitting")
                  : t("auth.login.submit")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </form>
        </Card>
      </Section>

      <Footer />
    </Page>
  );
};
