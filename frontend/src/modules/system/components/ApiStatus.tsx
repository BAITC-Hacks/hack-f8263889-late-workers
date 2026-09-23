import { cn } from "@/common/lib/utils";
import { API_URL } from "@/core/api";
import { useTranslation } from "react-i18next";

import { useHealth } from "../hooks/useHealth";

const DOT = {
  ok: "bg-success",
  degraded: "bg-warning",
  offline: "bg-destructive",
  loading: "bg-muted-foreground/40 animate-pulse",
} as const;

/** Tiny backend liveness badge: green = API + DB ok, amber = degraded, red = unreachable. */
export const ApiStatus = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const { data, isPending, isError } = useHealth();

  const state = isPending
    ? "loading"
    : isError
      ? "offline"
      : data?.status === "ok"
        ? "ok"
        : "degraded";

  return (
    <a
      href={`${API_URL}/docs`}
      target="_blank"
      rel="noreferrer"
      title={`${API_URL} · ${t(`system.status.${state}`)}`}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex h-9 items-center gap-2 rounded-md border px-2.5 font-mono text-xs transition-colors",
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", DOT[state])} />
      <span className="hidden sm:inline">api</span>
    </a>
  );
};
