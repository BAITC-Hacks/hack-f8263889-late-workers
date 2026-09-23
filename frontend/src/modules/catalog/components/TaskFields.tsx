import { definitionRow } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { isBlank } from "../helpers";
import { TASK_FIELDS, type TaskDetail } from "../types";

export const TaskFields = ({ fields }: { fields: TaskDetail["fields"] }) => {
  const { t } = useTranslation();

  return (
    <dl className="divide-y border-t">
      {TASK_FIELDS.map((key) => (
        <div key={key} className={definitionRow}>
          <dt className="text-muted-foreground text-sm font-medium">
            {t(`task.fields.${key}`)}
          </dt>
          {isBlank(fields[key]) ? (
            <dd className="text-muted-foreground text-sm">
              {t("task.notSpecified")}
            </dd>
          ) : (
            <dd className="text-sm whitespace-pre-line">{fields[key]}</dd>
          )}
        </div>
      ))}
    </dl>
  );
};
