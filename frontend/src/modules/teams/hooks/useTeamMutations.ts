import { authKeys } from "@/modules/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addMember, createTeam, removeMember, updateTeam } from "../api/teams";
import { withoutMember } from "../helpers";
import { teamsKeys } from "../queryKeys";
import type { AddMemberInput, Team, TeamInput } from "../types";

const useStoreTeam = () => {
  const queryClient = useQueryClient();
  return (team: Team) => {
    queryClient.setQueryData(teamsKeys.detail(team.id), team);
    void queryClient.invalidateQueries({ queryKey: teamsKeys.my() });
  };
};

export const useCreateTeam = () =>
  useMutation({ mutationFn: createTeam, onSuccess: useStoreTeam() });

export const useUpdateTeam = (id: number) =>
  useMutation({
    mutationFn: (input: TeamInput) => updateTeam(id, input),
    onSuccess: useStoreTeam(),
  });

export const useAddMember = (id: number) =>
  useMutation({
    mutationFn: (input: AddMemberInput) => addMember(id, input),
    onSuccess: useStoreTeam(),
  });

type RemoveMemberInput = { studentId: number; self: boolean };

/** A captain removing someone, or a member leaving (`self`). */
export const useRemoveMember = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId }: RemoveMemberInput) =>
      removeMember(id, studentId),
    onSuccess: (_data, { studentId, self }) => {
      if (self) queryClient.removeQueries({ queryKey: teamsKeys.detail(id) });
      else
        queryClient.setQueryData<Team>(
          teamsKeys.detail(id),
          (team) => team && withoutMember(team, studentId)
        );
      // Merged team skills and the proposals list follow the roster; refetch
      // everything except the session itself.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.all[0],
      });
    },
  });
};
