import { Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { useModalDialog } from "@/common/lib/useModalDialog";
import { formError } from "@/common/styles";
import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { isListed } from "../helpers";
import type { CardEditorState } from "../hooks/useCardEditor";
import type { BuilderTask } from "../types";
import { Spinner } from "./Feedback";

const BLOCKER_ID = "publish-blocker";

type CardActionsProps = { task: BuilderTask; editor: CardEditorState };

export const CardActions = ({ task, editor }: CardActionsProps) => {
  const { t } = useTranslation();
  const status = task.status.code;
  const busy = editor.pending !== null;
  const offersPublish = status === "review" || status === "unpublished";
  const blocked = offersPublish && editor.blocker !== null;

  return (
    <Stack gap="sm">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={busy}
          aria-busy={editor.pending === "confirm"}
        >
          {editor.pending === "confirm" && <Spinner />}
          {t(
            editor.pending === "confirm"
              ? "builder.card.confirming"
              : "builder.card.confirm"
          )}
        </Button>
        {offersPublish && (
          <Button
            type="button"
            disabled={busy || blocked}
            aria-busy={editor.publishing}
            aria-describedby={blocked ? BLOCKER_ID : undefined}
            onClick={() => void editor.publish()}
          >
            {editor.publishing && <Spinner />}
            {t(
              status === "review"
                ? "builder.publish.submit"
                : "builder.publish.republish"
            )}
          </Button>
        )}
        {isListed(status) && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => editor.setUnpublishOpen(true)}
          >
            {t("builder.publish.unpublish")}
          </Button>
        )}
      </div>
      {blocked && editor.blocker && (
        <p id={BLOCKER_ID} className="text-muted-foreground text-sm">
          {t(`builder.publish.blocked.${editor.blocker}`)}
        </p>
      )}
      {editor.message && (
        <p role="alert" className={formError}>
          {editor.message}
        </p>
      )}
    </Stack>
  );
};

export const PublicationNotice = ({ task }: { task: BuilderTask }) => {
  const { t } = useTranslation();

  if (isListed(task.status.code))
    return (
      <div
        role="status"
        className="border-success/40 bg-success/10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <CircleCheck className="text-success size-4" aria-hidden="true" />
          {t("builder.publish.published")}
        </span>
        <Link
          to={`/catalog/${task.id}`}
          className="text-primary font-medium hover:underline"
        >
          {t("builder.publish.openInCatalog")}
        </Link>
      </div>
    );

  if (task.status.code === "unpublished")
    return (
      <p className="bg-muted rounded-lg border px-4 py-3 text-sm">
        {t("builder.publish.unpublishedNotice")}
      </p>
    );

  return null;
};

type UnpublishDialogProps = {
  open: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const UnpublishDialog = ({
  open,
  pending,
  onConfirm,
  onClose,
}: UnpublishDialogProps) => {
  const { t } = useTranslation();
  const ref = useModalDialog(open);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="unpublish-title"
      aria-describedby="unpublish-text"
      className="bg-card text-card-foreground backdrop:bg-foreground/40 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border p-6"
    >
      <h2 id="unpublish-title" className="text-lg font-semibold">
        {t("builder.publish.dialogTitle")}
      </h2>
      <p id="unpublish-text" className="text-muted-foreground mt-2 text-sm">
        {t("builder.publish.dialogText")}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onClose}
        >
          {t("builder.publish.dialogCancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          aria-busy={pending}
          onClick={onConfirm}
        >
          {pending && <Spinner />}
          {t("builder.publish.dialogConfirm")}
        </Button>
      </div>
    </dialog>
  );
};
