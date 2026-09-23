import { Button } from "@/common/components/ui";
import { useAuthStore } from "@/modules/auth";
import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useToggleSave } from "../hooks/useToggleSave";

type SaveTaskButtonProps = { taskId: number; isSaved: boolean };

export const SaveTaskButton = ({ taskId, isSaved }: SaveTaskButtonProps) => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.user?.role);
  const toggle = useToggleSave();

  if (role !== "student") return null;

  const Icon = toggle.isPending
    ? LoaderCircle
    : isSaved
      ? BookmarkCheck
      : Bookmark;

  return (
    <Button
      type="button"
      size="sm"
      variant={isSaved ? "secondary" : "outline"}
      disabled={toggle.isPending}
      aria-busy={toggle.isPending}
      onClick={() => toggle.mutate({ id: taskId, isSaved })}
    >
      <Icon
        className={toggle.isPending ? "animate-spin" : undefined}
        aria-hidden="true"
      />
      {t(isSaved ? "save.saved" : "save.add")}
    </Button>
  );
};
