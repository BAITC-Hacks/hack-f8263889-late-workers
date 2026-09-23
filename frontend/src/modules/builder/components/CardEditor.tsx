import { Section, Stack } from "@/common/components/layout";
import { cn } from "@/common/lib/utils";
import { skeleton } from "@/common/styles";
import { TASK_FIELDS } from "@/modules/catalog";
import { useTranslation } from "react-i18next";

import {
  type CardFormValues,
  FIELD_MAX,
  TITLE_MAX,
  cardFieldId,
} from "../helpers";
import { useCardDefaults } from "../hooks/useCardDefaults";
import { useCardEditor } from "../hooks/useCardEditor";
import type { BuilderTask } from "../types";
import { CardInputField, IndustryField } from "./CardFields";
import { CardActions, PublicationNotice, UnpublishDialog } from "./Publication";
import { RatingPanel } from "./RatingPanel";

type CardEditorProps = { task: BuilderTask; defaults: CardFormValues };

const CardEditor = ({ task, defaults }: CardEditorProps) => {
  const { t } = useTranslation();
  const editor = useCardEditor(task, defaults);
  const { dirtyFields, errors } = editor.form.formState;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,48rem)_24rem]">
      <form noValidate onSubmit={editor.confirm} className="min-w-0 space-y-6">
        <PublicationNotice task={task} />
        <Section title={t("builder.card.title")} divider={false}>
          <Stack gap="lg">
            <CardInputField
              form={editor.form}
              name="title"
              id={cardFieldId("title")}
              label={t("builder.card.titleField")}
              max={TITLE_MAX}
              placeholder={t("builder.card.titlePlaceholder")}
              meta={task.card?.title ?? null}
              changed={!!dirtyFields.title}
              error={errors.title?.message}
              task={task}
            />
            <IndustryField
              form={editor.form}
              current={task.industry}
              changed={!!dirtyFields.industryCode}
              error={errors.industryCode?.message}
            />
            {TASK_FIELDS.map((key) => (
              <CardInputField
                key={key}
                form={editor.form}
                name={`fields.${key}`}
                id={cardFieldId(key)}
                label={t(`task.fields.${key}`)}
                max={FIELD_MAX}
                multiline
                placeholder={t("builder.card.empty")}
                meta={task.card?.fields[key] ?? null}
                changed={!!dirtyFields.fields?.[key]}
                error={errors.fields?.[key]?.message}
                task={task}
              />
            ))}
          </Stack>
        </Section>
        <CardActions task={task} editor={editor} />
      </form>
      <RatingPanel
        task={task}
        stale={editor.isDirty}
        onHint={editor.focusHint}
      />
      <UnpublishDialog
        open={editor.unpublishOpen}
        pending={editor.pending === "unpublish"}
        onConfirm={() => void editor.unpublish()}
        onClose={() => editor.setUnpublishOpen(false)}
      />
    </div>
  );
};

const CardSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      className="max-w-3xl space-y-6"
    >
      <div className={cn(skeleton, "h-7 w-48")} />
      {TASK_FIELDS.slice(0, 4).map((key) => (
        <div key={key} className="space-y-2">
          <div className={cn(skeleton, "h-4 w-32")} />
          <div className={cn(skeleton, "h-20 w-full")} />
        </div>
      ))}
    </div>
  );
};

/** The editor mounts once its starting values are known; a confirmation resets it from the response. */
export const CardStep = ({ task }: { task: BuilderTask }) => {
  const defaults = useCardDefaults(task);
  if (!defaults) return <CardSkeleton />;
  return <CardEditor key={task.id} task={task} defaults={defaults} />;
};
