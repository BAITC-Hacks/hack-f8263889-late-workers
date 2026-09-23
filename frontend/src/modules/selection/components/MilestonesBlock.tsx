import {
  Badge,
  Button,
  ConfirmDialog,
  FormError,
  FormField,
  PendingButton,
} from "@/common/components/ui";
import { metaLabel } from "@/common/styles";
import type { Milestone } from "@/modules/proposals";
import { useTranslation } from "react-i18next";

import { useMilestones } from "../hooks/useMilestones";

type MilestonesBlockProps = {
  taskId: number;
  proposalId: number;
  milestones: Milestone[];
};

export const MilestonesBlock = ({
  taskId,
  proposalId,
  milestones,
}: MilestonesBlockProps) => {
  const { t } = useTranslation();
  const flow = useMilestones(taskId, proposalId);
  const inputId = `milestone-title-${proposalId}`;
  const target = flow.pending?.milestone;

  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className={metaLabel}>{t("selection.milestones.title")}</h3>
      {milestones.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("selection.milestones.empty")}
        </p>
      ) : (
        <ul className="divide-y border-y">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2"
            >
              <span className="min-w-0 flex-1 text-sm break-words">
                {milestone.title}
              </span>
              {milestone.confirmed ? (
                <Badge variant="success">
                  {t("selection.milestones.confirmed", {
                    points: milestone.points,
                  })}
                </Badge>
              ) : (
                <>
                  <Badge variant="muted">
                    {t("selection.milestones.notConfirmed")}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => flow.ask(milestone, "confirm")}
                    >
                      {t("selection.milestones.confirm")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => flow.ask(milestone, "delete")}
                    >
                      {t("selection.milestones.delete")}
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        noValidate
        onSubmit={flow.submitAdd}
        className="max-w-xl space-y-2"
        aria-busy={flow.adding}
      >
        <FormError message={flow.addError.form} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <FormField
            id={inputId}
            label={t("selection.milestones.newLabel")}
            autoComplete="off"
            value={flow.title}
            onChange={(event) => flow.changeTitle(event.target.value)}
            disabled={flow.adding}
            error={flow.addError.field}
            className="flex-1"
          />
          <PendingButton
            type="submit"
            size="sm"
            pending={flow.adding}
            className="sm:mt-5 sm:h-9"
          >
            {t("selection.milestones.add")}
          </PendingButton>
        </div>
      </form>
      <ConfirmDialog
        open={flow.pending !== null}
        title={
          flow.pending?.action === "delete"
            ? t("selection.milestones.deleteTitle", { title: target?.title })
            : t("selection.milestones.confirmTitle")
        }
        description={
          flow.pending?.action === "confirm"
            ? t("selection.milestones.confirmDescription", {
                count: target?.points ?? 0,
              })
            : undefined
        }
        confirmLabel={t(
          flow.pending?.action === "delete"
            ? "selection.milestones.delete"
            : "selection.milestones.confirm"
        )}
        destructive={flow.pending?.action === "delete"}
        pending={flow.dialogPending}
        error={flow.dialogError}
        onConfirm={flow.runDialog}
        onCancel={flow.closeDialog}
      />
    </section>
  );
};
