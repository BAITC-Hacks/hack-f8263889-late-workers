import { pageDescription, pageTitle } from "@/common/styles";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { needsClarification } from "../helpers";
import type { TaskHeader } from "../types";

export const TaskHeading = ({ task }: { task: TaskHeader }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className={pageTitle}>{task.title}</h1>
        <p className={pageDescription}>{task.companyName}</p>
      </div>
      {needsClarification(task.rating) && (
        <p
          role="note"
          className="border-warning/40 bg-warning/10 text-foreground flex gap-3 rounded-md border px-4 py-3 text-sm"
        >
          <TriangleAlert
            className="text-warning mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          {t("proposals.form.lowRating")}
        </p>
      )}
    </div>
  );
};
