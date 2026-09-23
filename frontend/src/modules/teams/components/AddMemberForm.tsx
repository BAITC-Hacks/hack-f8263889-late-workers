import { FormError, FormField, PendingButton } from "@/common/components/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { addMemberError } from "../helpers";
import { useAddMember } from "../hooks/useTeamMutations";

type AddMemberFormProps = { teamId: number; full: boolean; limit: number };

export const AddMemberForm = ({ teamId, full, limit }: AddMemberFormProps) => {
  const { t } = useTranslation();
  const add = useAddMember(teamId);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<{ field?: string; form?: string }>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError({});
    add.mutate(
      { email: email.trim() },
      {
        onSuccess: () => setEmail(""),
        onError: (failure) =>
          setError(addMemberError(failure, t("teams.members.addFailed"))),
      }
    );
  };

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="max-w-xl space-y-3"
      aria-busy={add.isPending}
    >
      <FormError message={error.form} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <FormField
          id="member-email"
          type="email"
          autoComplete="off"
          label={t("teams.members.email")}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError({});
          }}
          disabled={full || add.isPending}
          error={error.field}
          hint={full ? t("teams.members.full", { limit }) : undefined}
          className="flex-1"
        />
        <PendingButton
          type="submit"
          pending={add.isPending}
          disabled={full || !email.trim()}
          className="sm:mt-5"
        >
          {t("teams.members.add")}
        </PendingButton>
      </div>
    </form>
  );
};
