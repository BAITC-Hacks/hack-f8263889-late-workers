import { Badge } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { tableCell, tableHeadCell } from "@/common/styles";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { SortOrder, User, UsersSort } from "../api/users";
import { formatCreatedAt, genderLabelKey, statusLabelKey } from "../helpers";

type UsersTableProps = {
  users: User[];
  sort: UsersSort | null;
  order: SortOrder;
  onSort: (field: UsersSort) => void;
};

type SortableHeadProps = {
  field: UsersSort;
  label: string;
  sort: UsersSort | null;
  order: SortOrder;
  onSort: (field: UsersSort) => void;
};

const SortableHead = ({
  field,
  label,
  sort,
  order,
  onSort,
}: SortableHeadProps) => {
  const isActive = sort === field;

  return (
    <th
      scope="col"
      className={tableHeadCell}
      aria-sort={
        isActive ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1 transition-colors",
          isActive && "text-foreground"
        )}
      >
        {label}
        {isActive &&
          (order === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
};

export const UsersTable = ({ users, sort, order, onSort }: UsersTableProps) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b">
          <tr>
            <th scope="col" className={tableHeadCell}>
              {t("users.table.firstName")}
            </th>
            <SortableHead
              field="lastName"
              label={t("users.table.lastName")}
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <SortableHead
              field="email"
              label={t("users.table.email")}
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col" className={tableHeadCell}>
              {t("users.table.phone")}
            </th>
            <th scope="col" className={tableHeadCell}>
              {t("users.table.gender")}
            </th>
            <th scope="col" className={tableHeadCell}>
              {t("users.table.status")}
            </th>
            <SortableHead
              field="createdAt"
              label={t("users.table.createdAt")}
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col" className={tableHeadCell}>
              {t("users.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => (
            <tr key={user.id}>
              <td className={tableCell}>{user.firstName}</td>
              <td className={tableCell}>{user.lastName}</td>
              <td className={cn(tableCell, "text-muted-foreground")}>
                {user.email}
              </td>
              <td className={cn(tableCell, "font-mono text-xs tabular-nums")}>
                {user.phone}
              </td>
              <td className={tableCell}>
                <Badge variant="muted">{t(genderLabelKey(user.gender))}</Badge>
              </td>
              <td className={tableCell}>
                <Badge
                  variant={user.status === "active" ? "success" : "destructive"}
                >
                  {t(statusLabelKey(user.status))}
                </Badge>
              </td>
              <td className={cn(tableCell, "tabular-nums")}>
                {formatCreatedAt(user.createdAt)}
              </td>
              {/* Row actions land here in stage 2. */}
              <td className={tableCell} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
