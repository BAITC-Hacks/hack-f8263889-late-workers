import { Page, Stack } from "@/common/components/layout";
import {
  Card,
  FormError,
  FormField,
  PendingButton,
} from "@/common/components/ui";
import { pageDescription, pageTitle } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { TagsInput } from "../components/TagsInput";
import { useProfileForm } from "../hooks/useProfileForm";
import { useAuthStore } from "../stores/useAuthStore";
import type { StudentUser } from "../types";

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== "student") return null;
  return <ProfileForm user={user} />;
};

const ProfileForm = ({ user }: { user: StudentUser }) => {
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
  } = useProfileForm(user.student);

  return (
    <Page>
      <Stack gap="lg" className="max-w-xl">
        <Stack gap="sm">
          <h1 className={pageTitle}>{t("profile.title")}</h1>
          <p className={pageDescription}>{user.email}</p>
        </Stack>
        <Card className="p-6 sm:p-8">
          <form
            noValidate
            onSubmit={onSubmit}
            className="space-y-5"
            aria-busy={pending}
          >
            <FormError message={errors.root?.message} />
            <fieldset disabled={pending} className="min-w-0 space-y-5">
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
              <PendingButton type="submit" pending={pending}>
                {t("common.save")}
              </PendingButton>
            </fieldset>
          </form>
        </Card>
      </Stack>
    </Page>
  );
};
