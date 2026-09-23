import type { User, UserRole } from "./types";

const HOME: Record<UserRole, string> = {
  business: "/business",
  student: "/catalog",
};

export const homeForUser = (user: User | null) =>
  user ? HOME[user.role] : "/login";

/** `end` keeps a parent section from lighting up on its child routes. */
export type SectionLink = { to: string; labelKey: string; end?: boolean };

const SECTION_LINKS: Record<UserRole, SectionLink[]> = {
  student: [
    { to: "/catalog", labelKey: "nav.catalog" },
    { to: "/student", labelKey: "nav.saved", end: true },
    { to: "/student/teams", labelKey: "nav.teams" },
    { to: "/student/proposals", labelKey: "nav.proposals" },
  ],
  business: [
    { to: "/catalog", labelKey: "nav.catalog" },
    { to: "/business", labelKey: "nav.myTasks" },
  ],
};

export const sectionLinks = (role: UserRole) => SECTION_LINKS[role];
