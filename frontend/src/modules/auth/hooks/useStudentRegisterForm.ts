import { useController, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { authResolver, showFormError } from "../components/formHelpers";
import type { RegisterStudentInput } from "../types";
import { normalizeStudentInput, validateStudent } from "../validation";
import { useRegisterStudent } from "./useRegister";
import { useTagsInput } from "./useTagsInput";

export const useStudentRegisterForm = () => {
  const { t } = useTranslation();
  const mutation = useRegisterStudent();
  const form = useForm<RegisterStudentInput>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      skills: [],
      technologies: [],
    },
    resolver: authResolver(validateStudent, t),
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
      await mutation.mutateAsync(
        normalizeStudentInput({
          ...values,
          skills: nextSkills.tags,
          technologies: nextTechnologies.tags,
        })
      );
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
    skills,
    technologies,
    skillsRef: skillsField.field.ref,
    technologiesRef: technologiesField.field.ref,
    skillsBlur: skillsField.field.onBlur,
    technologiesBlur: technologiesField.field.onBlur,
  };
};
