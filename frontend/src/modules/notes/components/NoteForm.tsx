import { Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { field, fieldError, fieldLabel } from "@/common/styles";
import { getErrorMessage, getFieldErrors } from "@/core/api";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export type NoteFormValues = {
  title: string;
  content: string;
};

type NoteFormProps = {
  /** Prefill for inline editing; leave out for the create form. */
  defaultValues?: NoteFormValues;
  submitLabel: string;
  /** Should reject with an ApiError so field / root errors land on the form. */
  onSubmit: (values: NoteFormValues) => Promise<unknown>;
  /** Rendered as a secondary button — used by the inline editor. */
  onCancel?: () => void;
  className?: string;
};

const EMPTY_VALUES: NoteFormValues = { title: "", content: "" };

/** Create / edit form for a note. Owns validation and API error display. */
export const NoteForm = ({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  className,
}: NoteFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    defaultValues: defaultValues ?? EMPTY_VALUES,
  });

  const submit = async (values: NoteFormValues) => {
    try {
      await onSubmit(values);
      reset(defaultValues ?? EMPTY_VALUES);
    } catch (err) {
      // 422 → per-field messages; anything else → root error line.
      const fieldErrors = getFieldErrors(err);
      let handled = false;
      for (const name of ["title", "content"] as const) {
        const message = fieldErrors[name];
        if (message) {
          setError(name, { message });
          handled = true;
        }
      }
      if (!handled) {
        setError("root", { message: getErrorMessage(err) });
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className={cn("space-y-6", className)}
    >
      <Stack gap="xs">
        <label className={fieldLabel}>{t("notes.form.titleLabel")}</label>
        <input
          type="text"
          className={field}
          aria-invalid={!!errors.title}
          placeholder={t("notes.form.titlePlaceholder")}
          {...register("title", {
            required: t("notes.form.errors.titleRequired"),
            maxLength: {
              value: 200,
              message: t("notes.form.errors.titleTooLong"),
            },
          })}
        />
        {errors.title && <p className={fieldError}>{errors.title.message}</p>}
      </Stack>

      <Stack gap="xs">
        <label className={fieldLabel}>{t("notes.form.contentLabel")}</label>
        <textarea
          rows={3}
          className={field + " resize-none"}
          aria-invalid={!!errors.content}
          placeholder={t("notes.form.contentPlaceholder")}
          {...register("content")}
        />
        {errors.content && (
          <p className={fieldError}>{errors.content.message}</p>
        )}
      </Stack>

      {errors.root && <p className={fieldError}>{errors.root.message}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? t("notes.form.saving") : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("notes.form.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
};
