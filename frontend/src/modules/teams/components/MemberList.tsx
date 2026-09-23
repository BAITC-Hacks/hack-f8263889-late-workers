import { Button } from "@/common/components/ui";
import { useTranslation } from "react-i18next";

import type { TeamMember } from "../types";
import { RoleBadge } from "./RoleBadge";
import { TagList } from "./TagList";

type MemberListProps = {
  members: TeamMember[];
  /** Set for the captain: every other member gets a remove button. */
  onRemove?: (member: TeamMember) => void;
};

export const MemberList = ({ members, onRemove }: MemberListProps) => {
  const { t } = useTranslation();
  return (
    <ul aria-label={t("teams.members.title")} className="divide-y border-y">
      {members.map((member) => (
        <li
          key={member.studentId}
          className="grid gap-3 py-4 sm:grid-cols-[minmax(12rem,18rem)_1fr_auto] sm:gap-6"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium break-words">{member.name}</span>
              {member.role === "captain" && <RoleBadge role="captain" />}
            </div>
            {member.email && (
              <p className="text-muted-foreground text-sm break-all">
                {member.email}
              </p>
            )}
          </div>
          <TagList
            tags={[...member.skills, ...member.technologies]}
            label={t("teams.members.tags", { name: member.name })}
          />
          <div>
            {onRemove && member.role !== "captain" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRemove(member)}
              >
                {t("teams.members.remove")}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
