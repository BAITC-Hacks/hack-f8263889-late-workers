import {
  Button,
  FormError,
  FormField,
  PendingButton,
} from "@/common/components/ui";
import { TagsInput } from "@/modules/auth";
import { useTranslation } from "react-i18next";

import type { useTeamForm } from "../hooks/useTeamForm";

type TeamFormProps = {
  form: ReturnType<typeof useTeamForm>;
  submitLabel: string;
  onCancel?: () => void;
};

export const TeamForm = ({ form, submitLabel, onCancel }: TeamFormProps) => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
    onSubmit,
    pending,
  } = form;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={pending}
    >
      <FormError message={errors.root?.message} />
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <FormField
          id="team-name"
          label={t("teams.form.name")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        <TagsInput
          id="interests"
          label={t("teams.form.interests")}
          tags={form.interests.tags}
          error={errors.interests?.message}
          inputRef={form.interests.inputRef}
          onBlur={form.interests.onBlur}
        />
        <div className="space-y-1">
          <TagsInput
            id="ownSkills"
            label={t("teams.form.ownSkills")}
            tags={form.ownSkills.tags}
            error={errors.ownSkills?.message}
            inputRef={form.ownSkills.inputRef}
            onBlur={form.ownSkills.onBlur}
          />
          <p className="text-muted-foreground text-xs">
            {t("teams.form.skillsHint")}
          </p>
        </div>
        <TagsInput
          id="ownTechnologies"
          label={t("teams.form.ownTechnologies")}
          tags={form.ownTechnologies.tags}
          error={errors.ownTechnologies?.message}
          inputRef={form.ownTechnologies.inputRef}
          onBlur={form.ownTechnologies.onBlur}
        />
        <div className="flex flex-wrap gap-2">
          <PendingButton type="submit" pending={pending}>
            {submitLabel}
          </PendingButton>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  );
};
