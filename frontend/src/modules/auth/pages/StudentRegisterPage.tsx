import { FormField } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import { AuthForm } from "../components/AuthForm";
import { AuthFormShell } from "../components/AuthFormShell";
import { RegistrationLinks } from "../components/RegistrationLinks";
import { TagsInput } from "../components/TagsInput";
import { useStudentRegisterForm } from "../hooks/useStudentRegisterForm";

export const StudentRegisterPage = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
    onSubmit,
    pending,
    skills,
    technologies,
    skillsRef,
    technologiesRef,
    skillsBlur,
    technologiesBlur,
  } = useStudentRegisterForm();
  return (
    <AuthFormShell
      title={t("auth.register.studentTitle")}
      description={t("auth.register.studentDescription")}
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
          id="name"
          label={t("auth.form.name")}
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TagsInput
          id="skills"
          label={t("auth.form.skills")}
          tags={skills}
          error={errors.skills?.message}
          inputRef={skillsRef}
          onBlur={skillsBlur}
        />
        <TagsInput
          id="technologies"
          label={t("auth.form.technologies")}
          tags={technologies}
          error={errors.technologies?.message}
          inputRef={technologiesRef}
          onBlur={technologiesBlur}
        />
      </AuthForm>
      <RegistrationLinks role="student" />
    </AuthFormShell>
  );
};
