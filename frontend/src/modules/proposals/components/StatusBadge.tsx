import { Badge } from "@/common/components/ui";

import { statusBadgeVariant } from "../helpers";
import type { Proposal } from "../types";

/** Status names come from the server, colours from the code. */
export const StatusBadge = ({ status }: { status: Proposal["status"] }) => (
  <Badge variant={statusBadgeVariant(status.code)}>{status.name}</Badge>
);
