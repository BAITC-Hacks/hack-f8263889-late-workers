import { Select } from "@/common/components/ui";
import { field, fieldLabel } from "@/common/styles";
import { useTranslation } from "react-i18next";

import type { StatusFilter } from "../helpers";

type UsersToolbarProps = {
  q: string;
  status: StatusFilter;
  onQChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
};

export const UsersToolbar = ({
  q,
  status,
  onQChange,
  onStatusChange,
}: UsersToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-full max-w-sm space-y-2">
        <label htmlFor="users-search" className={fieldLabel}>
          {t("users.toolbar.search")}
        </label>
        <input
          id="users-search"
          type="search"
          className={field}
          value={q}
          placeholder={t("users.toolbar.searchPlaceholder")}
          onChange={(event) => onQChange(event.target.value)}
        />
      </div>

      <div className="w-full max-w-xs space-y-2">
        <label htmlFor="users-status" className={fieldLabel}>
          {t("users.toolbar.status")}
        </label>
        <Select
          id="users-status"
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as StatusFilter)
          }
        >
          <option value="all">{t("users.toolbar.statusAll")}</option>
          <option value="active">{t("users.toolbar.statusActive")}</option>
          <option value="blocked">{t("users.toolbar.statusBlocked")}</option>
        </Select>
      </div>
    </div>
  );
};
