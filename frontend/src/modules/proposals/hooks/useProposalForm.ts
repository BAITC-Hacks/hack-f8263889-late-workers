import { applyFieldErrors, translatedResolver } from "@/common/lib/forms";
import { showToast } from "@/common/lib/toast";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { submitError, validateProposal } from "../helpers";
import type { Proposal, ProposalFormValues } from "../types";

type ProposalFormOptions = {
  defaultValues: ProposalFormValues;
  /** Create mode: the team is chosen in the form. */
  withTeam: boolean;
  submit: (values: ProposalFormValues) => Promise<Proposal>;
  successKey: string;
};

export const useProposalForm = ({
  defaultValues,
  withTeam,
  submit,
  successKey,
}: ProposalFormOptions) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm<ProposalFormValues>({
    defaultValues,
    resolver: translatedResolver(
      (values) => validateProposal(values, withTeam),
      t
    ),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submit(values);
      showToast(t(successKey));
      navigate("/student/proposals");
    } catch (error) {
      const { teamId: _teamId, ...editable } = values;
      if (applyFieldErrors(error, form.setError, withTeam ? values : editable))
        return;
      const { message, exists } = submitError(
        error,
        t("proposals.form.failed"),
        t("proposals.form.exists")
      );
      form.setError("root", {
        type: exists ? "exists" : "server",
        message,
      });
    }
  });

  return { ...form, onSubmit, pending: form.formState.isSubmitting };
};
