import type { User, UserRole } from "./types";

const HOME: Record<UserRole, string> = {
  business: "/business",
  student: "/catalog",
};

export const homeForUser = (user: User | null) =>
  user ? HOME[user.role] : "/login";

export type SectionLink = { to: string; labelKey: string };

const SECTION_LINKS: Record<UserRole, SectionLink[]> = {
  student: [
    { to: "/catalog", labelKey: "nav.catalog" },
    { to: "/student", labelKey: "nav.saved" },
  ],
  business: [
    { to: "/catalog", labelKey: "nav.catalog" },
    { to: "/business", labelKey: "nav.myTasks" },
  ],
};

export const sectionLinks = (role: UserRole) => SECTION_LINKS[role];
