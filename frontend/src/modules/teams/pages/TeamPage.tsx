import { Page, Stack } from "@/common/components/layout";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
} from "@/common/components/ui";
import { isNotFound, parseId } from "@/common/lib/query";
import {
  definitionRow,
  inlineLink,
  pageTitle,
  sectionTitle,
} from "@/common/styles";
import { useAuthStore } from "@/modules/auth";
import { ArrowLeft, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AddMemberForm } from "../components/AddMemberForm";
import { MemberList } from "../components/MemberList";
import { RoleBadge } from "../components/RoleBadge";
import { TeamPageSkeleton } from "../components/Skeletons";
import { TagList } from "../components/TagList";
import { TeamForm } from "../components/TeamForm";
import { isTeamFull, teamToInput } from "../helpers";
import { useTeam } from "../hooks/useTeam";
import { useTeamForm } from "../hooks/useTeamForm";
import { useRemoveMember, useUpdateTeam } from "../hooks/useTeamMutations";
import type { Team, TeamMember } from "../types";

export const TeamPage = () => {
  const { t } = useTranslation();
  const id = parseId(useParams().id);
  const team = useTeam(id);
  const notFound = id === null || (team.isError && isNotFound(team.error));

  const renderTeam = () => {
    if (notFound)
      return (
        <Stack gap="md">
          <h1 className={pageTitle}>{t("teams.notFound")}</h1>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/teams">{t("teams.myTeams")}</Link>
            </Button>
          </div>
        </Stack>
      );
    if (team.isPending) return <TeamPageSkeleton />;
    if (team.isError)
      return (
        <ErrorState
          message={t("teams.loadOneFailed")}
          onRetry={() => void team.refetch()}
        />
      );
    return <TeamDetails key={team.data.id} team={team.data} />;
  };

  return (
    <Page>
      <Stack gap="lg" className="max-w-5xl">
        {!notFound && (
          <Link to="/student/teams" className={inlineLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("teams.myTeams")}
          </Link>
        )}
        {renderTeam()}
      </Stack>
    </Page>
  );
};

const TeamDetails = ({ team }: { team: Team }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const myStudentId = useAuthStore((state) => state.user?.student?.id);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [leaving, setLeaving] = useState(false);
  const update = useUpdateTeam(team.id);
  const remove = useRemoveMember(team.id);
  const form = useTeamForm({
    defaultValues: teamToInput(team),
    submit: update.mutateAsync,
    onSaved: () => setEditing(false),
    failedKey: "teams.saveFailed",
  });
  const isCaptain = team.myRole === "captain";

  const closeDialog = () => {
    remove.reset();
    setRemoving(null);
    setLeaving(false);
  };

  const startEditing = () => {
    form.reset(teamToInput(team));
    setEditing(true);
  };

  const confirmRemove = () => {
    if (removing)
      remove.mutate(
        { studentId: removing.studentId, self: false },
        { onSuccess: closeDialog }
      );
  };

  const confirmLeave = () => {
    if (myStudentId === undefined) return;
    remove.mutate(
      { studentId: myStudentId, self: true },
      { onSuccess: () => navigate("/student/teams", { replace: true }) }
    );
  };

  return (
    <Stack gap="xl">
      <Stack gap="md">
        {team.myRole && (
          <div>
            <RoleBadge role={team.myRole} />
          </div>
        )}
        <h1 className={pageTitle}>{team.name}</h1>
        <p className="text-muted-foreground text-sm">
          {t("teams.points", { count: team.points })} ·{" "}
          {t("teams.card.membersLabel", {
            count: team.members.length,
            limit: team.membersLimit,
          })}
        </p>
        {isCaptain && !editing && (
          <div>
            <Button type="button" variant="outline" onClick={startEditing}>
              <Pencil aria-hidden="true" />
              {t("teams.edit")}
            </Button>
          </div>
        )}
      </Stack>

      {editing ? (
        <section aria-labelledby="team-edit-title" className="max-w-xl">
          <h2 id="team-edit-title" className={`${sectionTitle} mb-4`}>
            {t("teams.editTitle")}
          </h2>
          <Card className="p-6 sm:p-8">
            <TeamForm
              form={form}
              submitLabel={t("common.save")}
              onCancel={() => setEditing(false)}
            />
          </Card>
        </section>
      ) : (
        <dl className="divide-y border-y">
          {(
            [
              ["interests", team.interests],
              ["skills", team.skills],
              ["technologies", team.technologies],
            ] as const
          ).map(([key, tags]) => (
            <div key={key} className={definitionRow}>
              <dt className="text-muted-foreground text-sm">
                {t(`teams.fields.${key}`)}
              </dt>
              <dd>
                <TagList tags={tags} label={t(`teams.fields.${key}`)} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section aria-labelledby="team-members-title" className="space-y-4">
        <h2 id="team-members-title" className={sectionTitle}>
          {t("teams.members.title")}
        </h2>
        <MemberList
          members={team.members}
          onRemove={isCaptain ? setRemoving : undefined}
        />
        {isCaptain && (
          <AddMemberForm
            teamId={team.id}
            full={isTeamFull(team)}
            limit={team.membersLimit}
          />
        )}
        {team.myRole === "member" && (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaving(true)}
            >
              {t("teams.leave")}
            </Button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={removing !== null}
        title={t("teams.members.removeConfirm", { name: removing?.name })}
        confirmLabel={t("teams.members.remove")}
        destructive
        pending={remove.isPending}
        error={remove.isError ? t("teams.actionFailed") : undefined}
        onConfirm={confirmRemove}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={leaving}
        title={t("teams.leaveConfirm", { name: team.name })}
        confirmLabel={t("teams.leave")}
        destructive
        pending={remove.isPending}
        error={remove.isError ? t("teams.actionFailed") : undefined}
        onConfirm={confirmLeave}
        onCancel={closeDialog}
      />
    </Stack>
  );
};
