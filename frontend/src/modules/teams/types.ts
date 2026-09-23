export type TeamRole = "captain" | "member";

export type TeamMember = {
  studentId: number;
  name: string;
  /** Hidden (`null`) from users outside the team. */
  email: string | null;
  role: TeamRole;
  skills: string[];
  technologies: string[];
  joinedAt: string;
};

export type Team = {
  id: number;
  name: string;
  interests: string[];
  ownSkills: string[];
  ownTechnologies: string[];
  /** Own tags merged with every member's profile tags. */
  skills: string[];
  technologies: string[];
  points: number;
  myRole: TeamRole | null;
  membersLimit: number;
  members: TeamMember[];
  createdAt: string;
};

export type TeamSummary = {
  id: number;
  name: string;
  myRole: TeamRole;
  membersCount: number;
  membersLimit: number;
  skills: string[];
  technologies: string[];
  points: number;
};

export type TeamInput = {
  name: string;
  interests: string[];
  ownSkills: string[];
  ownTechnologies: string[];
};

export type AddMemberInput = { email: string };

export type TeamResponse = { team: Team };
export type TeamsResponse = { items: TeamSummary[] };
