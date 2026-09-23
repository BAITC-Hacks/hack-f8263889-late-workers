import { Badge, Button } from "@/common/components/ui";
import { useModalDialog } from "@/common/lib/useModalDialog";
import { cn } from "@/common/lib/utils";
import { tableCell } from "@/common/styles";
import { StatusBadge } from "@/modules/proposals";
import { TagList } from "@/modules/teams";
import { X } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  TEAM_MEMBERS_LIMIT,
  canDecide,
  compareHeadingId,
  shortestIds,
} from "../helpers";
import type { BusinessProposal, Verdict } from "../types";

type CompareDialogProps = {
  open: boolean;
  proposals: BusinessProposal[];
  onClose: () => void;
  onDecide: (proposal: BusinessProposal, verdict: Verdict) => void;
};

type Row = {
  key: string;
  render: (proposal: BusinessProposal) => ReactNode;
};

export const CompareDialog = ({
  open,
  proposals,
  onClose,
  onDecide,
}: CompareDialogProps) => {
  const { t } = useTranslation();
  const ref = useModalDialog(open);
  const titleId = useId();
  const openRef = useRef(open);
  openRef.current = open;
  const shortest = shortestIds(proposals);

  const rows: Row[] = [
    {
      key: "members",
      render: ({ team }) => (
        <span className="tabular-nums">
          {team.membersCount} / {TEAM_MEMBERS_LIMIT}
        </span>
      ),
    },
    {
      key: "points",
      render: ({ team }) => t("teams.points", { count: team.points }),
    },
    {
      key: "skills",
      render: ({ team }) => (
        <TagList
          tags={team.skills}
          label={t("selection.compare.rows.skills")}
        />
      ),
    },
    {
      key: "technologies",
      render: ({ team }) => (
        <TagList
          tags={team.technologies}
          label={t("selection.compare.rows.technologies")}
        />
      ),
    },
    {
      key: "duration",
      render: (proposal) => (
        <span
          className={cn(
            "inline-flex flex-wrap items-center gap-2",
            shortest.has(proposal.id) && "font-semibold"
          )}
        >
          {t("proposals.card.weeks", { count: proposal.durationWeeks })}
          {shortest.has(proposal.id) && proposals.length > 1 && (
            <Badge variant="success">{t("selection.compare.shortest")}</Badge>
          )}
        </span>
      ),
    },
    {
      key: "idea",
      render: (proposal) => (
        <p className="text-sm whitespace-pre-line">{proposal.idea}</p>
      ),
    },
    {
      key: "plan",
      render: (proposal) => (
        <p className="text-sm whitespace-pre-line">{proposal.plan}</p>
      ),
    },
    {
      key: "prototype",
      render: ({ prototypeUrl }) =>
        prototypeUrl ? (
          <a
            href={prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary break-all hover:underline"
          >
            {prototypeUrl}
          </a>
        ) : (
          <span className="text-muted-foreground">
            {t("selection.compare.noPrototype")}
          </span>
        ),
    },
    {
      key: "status",
      render: (proposal) => <StatusBadge status={proposal.status} />,
    },
    {
      key: "decision",
      render: (proposal) =>
        canDecide(proposal) ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onDecide(proposal, "select")}
            >
              {t("selection.card.select")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDecide(proposal, "reject")}
            >
              {t("selection.card.reject")}
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            {t("selection.compare.decided")}
          </span>
        ),
    },
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      className="bg-card text-card-foreground backdrop:bg-foreground/40 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-6xl rounded-lg border p-0 open:flex open:flex-col"
    >
      <div className="flex items-center gap-4 border-b px-5 py-4">
        <h2 id={titleId} className="flex-1 text-lg font-semibold">
          {t("selection.compare.title")}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <X aria-hidden="true" />
          {t("selection.compare.close")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-card sticky top-0 z-10 border-b">
            <tr>
              <th scope="col" className={cn(tableCell, "w-40")}>
                <span className="sr-only">
                  {t("selection.compare.rows.team")}
                </span>
              </th>
              {proposals.map((proposal) => (
                <th
                  key={proposal.id}
                  scope="col"
                  className={cn(tableCell, "min-w-60 align-top")}
                >
                  <span
                    id={compareHeadingId(proposal.id)}
                    tabIndex={-1}
                    className="text-base font-semibold outline-hidden"
                  >
                    {proposal.team.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className={cn(
                    tableCell,
                    "text-muted-foreground align-top font-medium"
                  )}
                >
                  {t(`selection.compare.rows.${row.key}`)}
                </th>
                {proposals.map((proposal) => (
                  <td key={proposal.id} className={cn(tableCell, "align-top")}>
                    {row.render(proposal)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </dialog>
  );
};
