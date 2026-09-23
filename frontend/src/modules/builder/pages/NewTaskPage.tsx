import { Page, Stack } from "@/common/components/layout";
import { Button, Card, Select } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import {
  field,
  fieldError,
  fieldLabel,
  formError,
  inlineLink,
  pageDescription,
  pageTitle,
  prose,
} from "@/common/styles";
import { ErrorState, useIndustries } from "@/modules/catalog";
import { ArrowLeft } from "lucide-react";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CharCount, Spinner } from "../components/Feedback";
import { DRAFT_MAX } from "../helpers";
import { useNewTaskForm } from "../hooks/useNewTaskForm";

export const NewTaskPage = () => {
  const { t } = useTranslation();
  const industries = useIndustries();
  const { form, draftText, industryCode, onSubmit, phase } = useNewTaskForm();
  const length = useWatch({ control: form.control, name: "draftText" }).length;
  const { errors } = form.formState;

  return (
    <Page>
      <Stack gap="lg">
        <Link to="/business" className={inlineLink}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("builder.back")}
        </Link>
        <Stack gap="sm" className={prose}>
          <h1 className={pageTitle}>{t("builder.new.title")}</h1>
          <p className={pageDescription}>{t("builder.new.description")}</p>
        </Stack>
        <Card className="max-w-xl p-6">
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            {errors.root && (
              <p role="alert" className={formError}>
                {errors.root.message}
              </p>
            )}
            <Stack gap="xs">
              <label htmlFor="draft-text" className={fieldLabel}>
                {t("builder.new.draftText")}
              </label>
              <textarea
                id="draft-text"
                rows={8}
                className={field}
                aria-invalid={!!errors.draftText}
                aria-describedby={
                  errors.draftText ? "draft-text-error" : undefined
                }
                {...draftText}
              />
              <div className="flex items-start gap-3">
                {errors.draftText && (
                  <p
                    id="draft-text-error"
                    role="alert"
                    className={cn(fieldError, "flex-1")}
                  >
                    {errors.draftText.message}
                  </p>
                )}
                <span className="ml-auto">
                  <CharCount value={length} max={DRAFT_MAX} />
                </span>
              </div>
            </Stack>
            <Stack gap="xs">
              <label htmlFor="industry" className={fieldLabel}>
                {t("builder.new.industry")}
              </label>
              <Select
                id="industry"
                disabled={industries.isPending}
                aria-invalid={!!errors.industryCode}
                aria-describedby={
                  errors.industryCode ? "industry-error" : undefined
                }
                {...industryCode}
              >
                <option value="">{t("builder.new.industryPlaceholder")}</option>
                {industries.data?.map((industry) => (
                  <option key={industry.code} value={industry.code}>
                    {industry.name}
                  </option>
                ))}
              </Select>
              {errors.industryCode && (
                <p id="industry-error" role="alert" className={fieldError}>
                  {errors.industryCode.message}
                </p>
              )}
              {industries.isError && (
                <ErrorState
                  message={t("builder.new.industriesError")}
                  onRetry={() => void industries.refetch()}
                />
              )}
            </Stack>
            <Button type="submit" disabled={phase !== null} aria-busy={!!phase}>
              {phase && <Spinner />}
              {t(phase ? `builder.new.${phase}` : "builder.new.submit")}
            </Button>
          </form>
        </Card>
      </Stack>
    </Page>
  );
};
