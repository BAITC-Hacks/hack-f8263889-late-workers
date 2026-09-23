import { Badge } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import type { TeamRole } from "../types";

export const RoleBadge = ({ role }: { role: TeamRole }) => {
  const { t } = useTranslation();
  return (
    <Badge variant={role === "captain" ? "primary" : "muted"}>
      {t(`teams.roles.${role}`)}
    </Badge>
  );
};
