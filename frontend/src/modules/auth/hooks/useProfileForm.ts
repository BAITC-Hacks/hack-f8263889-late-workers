import { showToast } from "@/common/lib/toast";
import { useController, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { authResolver, showFormError } from "../components/formHelpers";
import type { StudentUser, UpdateProfileInput } from "../types";
import { normalizeProfileInput, validateProfile } from "../validation";
import { useTagsInput } from "./useTagsInput";
import { useUpdateProfile } from "./useUpdateProfile";

export const useProfileForm = (student: StudentUser["student"]) => {
  const { t } = useTranslation();
  const mutation = useUpdateProfile();
  const form = useForm<UpdateProfileInput>({
    defaultValues: {
      name: student.name,
      skills: student.skills,
      technologies: student.technologies,
    },
    resolver: authResolver(validateProfile, t),
  });
  const skillsField = useController({ name: "skills", control: form.control });
  const technologiesField = useController({
    name: "technologies",
    control: form.control,
  });
  const skills = useTagsInput(skillsField.field);
  const technologies = useTagsInput(technologiesField.field);

  const onSubmit = form.handleSubmit(async (values) => {
    const nextSkills = skills.commit();
    const nextTechnologies = technologies.commit();
    if (nextSkills.error || nextTechnologies.error) {
      form.setFocus(nextSkills.error ? "skills" : "technologies");
      return;
    }
    try {
      const user = await mutation.mutateAsync(
        normalizeProfileInput({
          ...values,
          skills: nextSkills.tags,
          technologies: nextTechnologies.tags,
        })
      );
      if (user.role === "student") {
        const { name, skills, technologies } = user.student;
        form.reset({ name, skills, technologies });
      }
      showToast(t("profile.saved"));
    } catch (error) {
      showFormError(error, form.setError, values, t("profile.saveFailed"));
    }
  });

  return {
    ...form,
    onSubmit,
    pending: mutation.isPending || form.formState.isSubmitting,
    skills,
    technologies,
    skillsRef: skillsField.field.ref,
    technologiesRef: technologiesField.field.ref,
    skillsBlur: skillsField.field.onBlur,
    technologiesBlur: technologiesField.field.onBlur,
  };
};
