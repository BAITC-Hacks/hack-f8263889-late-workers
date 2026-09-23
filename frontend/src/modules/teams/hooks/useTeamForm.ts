import { applyFieldErrors, translatedResolver } from "@/common/lib/forms";
import { useTagsInput } from "@/modules/auth";
import { useController, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { normalizeTeamInput, validateTeam } from "../helpers";
import type { Team, TeamInput } from "../types";

type TeamFormOptions = {
  defaultValues: TeamInput;
  submit: (input: TeamInput) => Promise<Team>;
  onSaved: (team: Team) => void;
  failedKey: string;
};

const useTagsField = (
  name: "interests" | "ownSkills" | "ownTechnologies",
  control: ReturnType<typeof useForm<TeamInput>>["control"]
) => {
  const { field } = useController({ name, control });
  return {
    tags: useTagsInput(field),
    inputRef: field.ref,
    onBlur: field.onBlur,
  };
};

export const useTeamForm = ({
  defaultValues,
  submit,
  onSaved,
  failedKey,
}: TeamFormOptions) => {
  const { t } = useTranslation();
  const form = useForm<TeamInput>({
    defaultValues,
    resolver: translatedResolver(validateTeam, t),
  });
  const interests = useTagsField("interests", form.control);
  const ownSkills = useTagsField("ownSkills", form.control);
  const ownTechnologies = useTagsField("ownTechnologies", form.control);

  const onSubmit = form.handleSubmit(async (values) => {
    const committed = {
      interests: interests.tags.commit(),
      ownSkills: ownSkills.tags.commit(),
      ownTechnologies: ownTechnologies.tags.commit(),
    };
    const invalid = (Object.keys(committed) as (keyof typeof committed)[]).find(
      (name) => committed[name].error
    );
    if (invalid) {
      form.setFocus(invalid);
      return;
    }
    try {
      const team = await submit(
        normalizeTeamInput({
          name: values.name,
          interests: committed.interests.tags,
          ownSkills: committed.ownSkills.tags,
          ownTechnologies: committed.ownTechnologies.tags,
        })
      );
      onSaved(team);
    } catch (error) {
      if (!applyFieldErrors(error, form.setError, values))
        form.setError("root", { type: "server", message: t(failedKey) });
    }
  });

  return {
    ...form,
    onSubmit,
    pending: form.formState.isSubmitting,
    interests,
    ownSkills,
    ownTechnologies,
  };
};
