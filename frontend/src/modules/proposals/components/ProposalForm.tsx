import {
  FormError,
  FormField,
  PendingButton,
  Select,
  TextareaField,
} from "@/common/components/ui";
import { fieldError, fieldLabel } from "@/common/styles";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { IDEA_MAX, PLAN_MAX } from "../helpers";
import type { useProposalForm } from "../hooks/useProposalForm";

type ProposalFormProps = {
  form: ReturnType<typeof useProposalForm>;
  submitLabel: string;
  /** Create mode offers these teams; edit mode shows `teamName` instead. */
  teams?: { id: number; name: string }[];
  teamName?: string;
};

export const ProposalForm = ({
  form,
  submitLabel,
  teams,
  teamName,
}: ProposalFormProps) => {
  const { t } = useTranslation();
  const {
    register,
    watch,
    onSubmit,
    pending,
    formState: { errors },
  } = form;
  const teamError = errors.teamId?.message;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={pending}
    >
      <FormError message={errors.root?.message}>
        {errors.root?.type === "exists" && (
          <Link to="/student/proposals" className="font-medium underline">
            {t("proposals.open")}
          </Link>
        )}
      </FormError>
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        {teams ? (
          <div className="space-y-1">
            <label htmlFor="teamId" className={fieldLabel}>
              {t("proposals.form.team")}
            </label>
            <Select
              id="teamId"
              aria-invalid={!!teamError}
              aria-describedby={teamError ? "teamId-error" : undefined}
              {...register("teamId")}
            >
              <option value="">{t("proposals.form.chooseTeam")}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
            {teamError && (
              <p id="teamId-error" className={fieldError} role="alert">
                {teamError}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className={fieldLabel}>{t("proposals.form.team")}</p>
            <p className="text-sm font-medium">{teamName}</p>
          </div>
        )}
        <TextareaField
          id="idea"
          label={t("proposals.form.idea")}
          length={watch("idea").length}
          limit={IDEA_MAX}
          error={errors.idea?.message}
          {...register("idea")}
        />
        <TextareaField
          id="plan"
          label={t("proposals.form.plan")}
          rows={7}
          length={watch("plan").length}
          limit={PLAN_MAX}
          error={errors.plan?.message}
          {...register("plan")}
        />
        <FormField
          id="durationWeeks"
          type="number"
          inputMode="numeric"
          min={1}
          max={52}
          step={1}
          label={t("proposals.form.durationWeeks")}
          error={errors.durationWeeks?.message}
          className="max-w-48"
          {...register("durationWeeks")}
        />
        <FormField
          id="prototypeUrl"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://"
          label={t("proposals.form.prototypeUrl")}
          error={errors.prototypeUrl?.message}
          {...register("prototypeUrl")}
        />
        <PendingButton type="submit" pending={pending}>
          {submitLabel}
        </PendingButton>
      </fieldset>
    </form>
  );
};
