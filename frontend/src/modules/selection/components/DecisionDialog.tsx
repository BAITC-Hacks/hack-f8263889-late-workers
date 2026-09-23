import { ConfirmDialog, TextareaField } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import { COMMENT_MAX } from "../helpers";
import type { DecisionFlow } from "../hooks/useDecisionFlow";

export const DecisionDialog = ({ flow }: { flow: DecisionFlow }) => {
  const { t } = useTranslation();
  const { target } = flow;
  const title = target
    ? t(
        target.verdict === "select"
          ? "selection.decision.selectTitle"
          : "selection.decision.rejectTitle",
        { team: target.teamName }
      )
    : "";

  return (
    <ConfirmDialog
      open={target !== null}
      title={title}
      confirmLabel={t("selection.decision.confirm")}
      destructive={target?.verdict === "reject"}
      pending={flow.pending}
      error={flow.error.form}
      onConfirm={flow.submit}
      onCancel={flow.close}
    >
      <TextareaField
        id="decision-comment"
        label={t("selection.decision.comment")}
        rows={4}
        value={flow.comment}
        onChange={(event) => flow.changeComment(event.target.value)}
        length={flow.comment.length}
        limit={COMMENT_MAX}
        error={flow.error.field}
        disabled={flow.pending}
      />
    </ConfirmDialog>
  );
};
