import { Footer, Page, Section, Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { iconButton, pageDescription, pageTitle, prose } from "@/common/styles";
import { useAppStore } from "@/modules/dashboard";
import { ArrowRight, Minus, Plus, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const STACK_KEYS = [
  { name: "Vite", noteKey: "home.stack.vite" },
  { name: "React 19", noteKey: "home.stack.react" },
  { name: "TypeScript", noteKey: "home.stack.typescript" },
  { name: "Tailwind CSS", noteKey: "home.stack.tailwind" },
  { name: "shadcn/ui", noteKey: "home.stack.shadcn" },
  { name: "Framer Motion", noteKey: "home.stack.framer" },
  { name: "i18next", noteKey: "home.stack.i18next" },
  { name: "Zustand", noteKey: "home.stack.zustand" },
  { name: "TanStack Query", noteKey: "home.stack.tanstack" },
  { name: "React Hook Form", noteKey: "home.stack.hookForm" },
  { name: "Zod", noteKey: "home.stack.zod" },
  { name: "React Router", noteKey: "home.stack.router" },
];

export const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { count, increase } = useAppStore();
  const [shouldThrow, setShouldThrow] = useState(false);

  // React only catches errors thrown during render — flip state, then throw
  // on the next render so the outer ErrorBoundary picks it up.
  if (shouldThrow) {
    throw new Error("💥 Boom — triggered from the demo button.");
  }

  return (
    <Page>
      <Section divider={false}>
        <Stack gap="lg" className={prose}>
          <h1 className={pageTitle}>{t("welcome")}</h1>
          <p className={pageDescription}>{t("home.heroSubtitle")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => navigate("/notes")}
              className="group"
            >
              {t("nav.notes")}
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/chat")}
            >
              {t("nav.chat")}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate("/contact")}
            >
              {t("goContact")}
            </Button>
          </div>
        </Stack>
      </Section>

      <Section title={t("home.stackTitle")} delay={0.1}>
        <ul className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
          {STACK_KEYS.map((item, i) => (
            <li
              key={item.name}
              className="flex items-baseline gap-4 border-b py-3 text-sm"
            >
              <span className="text-muted-foreground w-6 shrink-0 font-mono text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="w-32 shrink-0 font-medium">{item.name}</span>
              <span className="text-muted-foreground">{t(item.noteKey)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={t("home.counterTitle")}
        description={t("home.counterHint")}
        delay={0.2}
      >
        <div className="flex max-w-xs items-end justify-between gap-6">
          <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
            {String(count).padStart(2, "0")}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                useAppStore.setState((s) => ({
                  count: Math.max(0, s.count - 1),
                }))
              }
              className={iconButton}
              aria-label={t("decrement")}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={increase}
              className={iconButton}
              aria-label={t("increment")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Section>

      <Section title={t("boom.title")} description={t("boom.hint")} delay={0.4}>
        <div>
          <button
            type="button"
            onClick={() => setShouldThrow(true)}
            className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors"
          >
            <Zap className="h-4 w-4" />
            {t("boom.action")}
          </button>
        </div>
      </Section>

      <Footer />
    </Page>
  );
};
