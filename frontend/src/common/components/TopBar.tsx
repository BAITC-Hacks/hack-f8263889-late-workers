import { Button } from "@/common/components/ui";
import { fieldError } from "@/common/styles";
import { useAuthStore, useLogout } from "@/modules/auth";
import { ThemeToggle } from "@/modules/theme";
import { LoaderCircle, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const LANGS = ["en", "ru", "kk"] as const;

export const TopBar = () => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="flex min-h-14 w-full flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3 sm:px-10">
        <div
          className={
            "flex min-w-0 flex-1 items-center gap-4 " +
            (user ? "basis-full sm:basis-auto" : "")
          }
        >
          <Link
            to="/"
            className="hover:text-primary shrink-0 text-sm font-semibold tracking-tight"
          >
            rsk<span className="text-primary">/</span>
          </Link>
          {user && (
            <span className="min-w-0 text-sm font-medium break-words">
              {user.role === "business"
                ? user.business.companyName
                : user.student.name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <Button
              type="button"
              variant="outline"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-busy={logout.isPending}
            >
              {logout.isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <LogOut aria-hidden="true" />
              )}
              {t("nav.logout")}
            </Button>
          )}
          <div
            role="group"
            aria-label={t("auth.language")}
            className="flex h-9 items-center rounded-md border p-0.5 text-xs font-medium"
          >
            {LANGS.map((lng) => (
              <button
                key={lng}
                type="button"
                aria-pressed={i18n.language.startsWith(lng)}
                onClick={() => i18n.changeLanguage(lng)}
                className={
                  "flex h-full items-center rounded-xs px-2.5 uppercase transition-colors " +
                  (i18n.language.startsWith(lng)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {lng}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
        {logout.isError && (
          <p role="alert" className={`w-full ${fieldError}`}>
            {t("auth.errors.logoutFailed")}
          </p>
        )}
      </div>
    </header>
  );
};
