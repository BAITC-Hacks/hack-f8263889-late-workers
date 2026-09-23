import { Stack } from "@/common/components/layout";
import { Badge, Select, Tooltip } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { field, fieldError, fieldLabel } from "@/common/styles";
import { type Industry, useIndustries } from "@/modules/catalog";
import { CircleCheck } from "lucide-react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  type CardFormValues,
  type SourceNote,
  cardFieldId,
  describeSources,
  fieldMark,
  fieldMarkVariant,
  industryOptions,
  sourceNoteKey,
} from "../helpers";
import type { BuilderTask, CardField, CardFieldKey } from "../types";
import { CharCount } from "./Feedback";

const SourceNotes = ({ notes }: { notes: SourceNote[] }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="block font-medium">
        {t("builder.card.sourcesTitle")}
      </span>
      {notes.map((note, index) => (
        <span key={index} className="mt-1 block">
          {t(sourceNoteKey(note), { text: note.text })}
        </span>
      ))}
    </>
  );
};

type FieldMarksProps = {
  meta: CardField | null;
  changed: boolean;
  task: BuilderTask;
};

const FieldMarks = ({ meta, changed, task }: FieldMarksProps) => {
  const { t } = useTranslation();
  const mark = fieldMark(meta?.source ?? null, changed);
  const notes = mark === "ai" ? describeSources(task, meta?.sources ?? []) : [];
  const badge = mark && (
    <Badge variant={fieldMarkVariant(mark)}>
      {t(`builder.card.marks.${mark}`)}
    </Badge>
  );

  return (
    <>
      {notes.length > 0 ? (
        <Tooltip content={<SourceNotes notes={notes} />}>{badge}</Tooltip>
      ) : (
        badge
      )}
      {meta?.confirmed && !changed && (
        <span className="text-success inline-flex items-center gap-1 text-xs font-medium">
          <CircleCheck className="size-3.5" aria-hidden="true" />
          {t("builder.card.confirmed")}
        </span>
      )}
    </>
  );
};

type CardInputFieldProps = {
  form: UseFormReturn<CardFormValues>;
  name: "title" | `fields.${CardFieldKey}`;
  id: string;
  label: string;
  max: number;
  multiline?: boolean;
  placeholder: string;
  meta: CardField | null;
  changed: boolean;
  error?: string;
  task: BuilderTask;
};

export const CardInputField = ({
  form,
  name,
  id,
  label,
  max,
  multiline = false,
  placeholder,
  meta,
  changed,
  error,
  task,
}: CardInputFieldProps) => {
  const value = useWatch({ control: form.control, name });
  const control = {
    id,
    placeholder,
    className: field,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
    ...form.register(name),
  };

  return (
    <Stack gap="xs">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={fieldLabel}>
          {label}
        </label>
        <FieldMarks meta={meta} changed={changed} task={task} />
      </div>
      {multiline ? (
        <textarea rows={3} {...control} />
      ) : (
        <input type="text" {...control} />
      )}
      <div className="flex items-start gap-3">
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className={cn(fieldError, "flex-1")}
          >
            {error}
          </p>
        )}
        <span className="ml-auto">
          <CharCount value={value.length} max={max} />
        </span>
      </div>
    </Stack>
  );
};

type IndustryFieldProps = {
  form: UseFormReturn<CardFormValues>;
  current: Industry;
  changed: boolean;
  error?: string;
};

export const IndustryField = ({
  form,
  current,
  changed,
  error,
}: IndustryFieldProps) => {
  const { t } = useTranslation();
  const industries = useIndustries();
  const id = cardFieldId("industryCode");

  return (
    <Stack gap="xs">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={fieldLabel}>
          {t("builder.card.industry")}
        </label>
        {changed && (
          <Badge variant={fieldMarkVariant("changed")}>
            {t("builder.card.marks.changed")}
          </Badge>
        )}
      </div>
      {/* Remounted once the list arrives, so the form writes its value into the full list. */}
      <Select
        key={industries.data ? "loaded" : "loading"}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...form.register("industryCode")}
      >
        {industryOptions(industries.data, current).map((industry) => (
          <option key={industry.code} value={industry.code}>
            {industry.name}
          </option>
        ))}
      </Select>
      {error && (
        <p id={`${id}-error`} role="alert" className={fieldError}>
          {error}
        </p>
      )}
    </Stack>
  );
};
