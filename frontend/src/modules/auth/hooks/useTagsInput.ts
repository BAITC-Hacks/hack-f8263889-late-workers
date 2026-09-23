import { type KeyboardEvent, useState } from "react";

import { MAX_TAGS, type ValidationKey, addTag } from "../validation";

type TagsInputOptions = {
  value: string[];
  onChange: (value: string[]) => void;
};

export const useTagsInput = ({ value, onChange }: TagsInputOptions) => {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<ValidationKey>();

  const changeDraft = (next: string) => {
    setDraft(next);
    setError(undefined);
  };

  const commit = () => {
    const result = addTag(value, draft);
    setError(result.error);
    if (!result.error) {
      onChange(result.tags);
      setDraft("");
    }
    return result;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    }
  };

  const remove = (index: number) => {
    onChange(value.filter((_, current) => current !== index));
    setError(undefined);
  };

  return {
    value,
    draft,
    error,
    changeDraft,
    commit,
    onKeyDown,
    remove,
    full: value.length >= MAX_TAGS,
  };
};
