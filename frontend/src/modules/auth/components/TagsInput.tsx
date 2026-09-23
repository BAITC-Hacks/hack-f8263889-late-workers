import { Stack } from "@/common/components/layout";
import { field, fieldError, fieldLabel } from "@/common/styles";
import { X } from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";

import type { useTagsInput } from "../hooks/useTagsInput";
import { MAX_TAGS } from "../validation";

type TagsInputProps = {
  id: string;
  label: string;
  tags: ReturnType<typeof useTagsInput>;
  error?: string;
  inputRef: Ref<HTMLInputElement>;
  onBlur: () => void;
};

export const TagsInput = ({
  id,
  label,
  tags,
  error,
  inputRef,
  onBlur,
}: TagsInputProps) => {
  const { t } = useTranslation();
  const message = tags.error ? t(`auth.errors.${tags.error}`) : error;
  return (
    <Stack gap="sm">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {tags.value.length > 0 && (
        <ul aria-label={label} className="flex flex-wrap gap-2">
          {tags.value.map((tag, index) => (
            <li
              key={tag}
              className="bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-1 rounded-md border py-1 pr-1 pl-2 text-sm"
            >
              <span className="min-w-0 break-words">{tag}</span>
              <button
                type="button"
                onClick={() => tags.remove(index)}
                aria-label={t("auth.tags.remove", { tag })}
                className="hover:bg-accent focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-xs outline-hidden focus-visible:ring-1"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        id={id}
        name={id}
        type="text"
        className={field}
        value={tags.draft}
        onChange={(event) => tags.changeDraft(event.target.value)}
        onKeyDown={tags.onKeyDown}
        onBlur={onBlur}
        disabled={tags.full}
        aria-invalid={!!message}
        aria-describedby={`${id}-hint${message ? ` ${id}-error` : ""}`}
        placeholder={t("auth.tags.placeholder")}
        autoComplete="off"
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {t("auth.tags.hint")} · {tags.value.length}/{MAX_TAGS}
      </p>
      {message && (
        <p id={`${id}-error`} className={fieldError} role="alert">
          {message}
        </p>
      )}
    </Stack>
  );
};
