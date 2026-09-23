import { useAuthStore, useLogout, useMe } from "@/modules/auth";
import { ApiStatus } from "@/modules/system";
import { ThemeToggle } from "@/modules/theme";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";

const LANGS = ["en", "ru", "kk"] as const;

const NAV = [
  { to: "/notes", key: "nav.notes" },
  { to: "/chat", key: "nav.chat" },
] as const;

export const TopBar = () => {
  const { t, i18n } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-6 sm:px-10">
        <div className="flex items-center gap-5">
          <Link
            to="/"
            className="hover:text-primary text-sm font-semibold tracking-tight"
          >
            rsk<span className="text-primary">/</span>
          </Link>
          <nav className="flex items-center gap-4">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  "text-sm font-medium transition-colors " +
                  (isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {me && (
                <span className="text-muted-foreground hidden text-xs md:inline">
                  {me.email}
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                title={t("nav.logout")}
                aria-label={t("nav.logout")}
                className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-muted-foreground hover:text-foreground flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors"
            >
              {t("nav.login")}
            </Link>
          )}
          <ApiStatus />
          <div className="flex h-9 items-center rounded-md border p-0.5 text-xs font-medium">
            {LANGS.map((lng) => {
              const active = i18n.language.startsWith(lng);
              return (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
                  className={
                    "flex h-full items-center rounded-xs px-2.5 uppercase transition-colors " +
                    (active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {lng}
                </button>
              );
            })}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
