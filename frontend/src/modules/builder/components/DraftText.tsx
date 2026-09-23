import { Stack } from "@/common/components/layout";
import { Button } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { formError } from "@/common/styles";
import { useTranslation } from "react-i18next";

import { useAnalyzeDraft } from "../hooks/useAnalyzeDraft";
import { Spinner } from "./Feedback";

type DraftTextBlockProps = { text: string | null; open: boolean };

export const DraftTextBlock = ({ text, open }: DraftTextBlockProps) => {
  const { t } = useTranslation();
  return (
    <details open={open} className="rounded-lg border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        {t("builder.draftText.title")}
      </summary>
      <p
        className={cn(
          "border-t px-4 py-3 text-sm whitespace-pre-line",
          !text && "text-muted-foreground"
        )}
      >
        {text || t("builder.draftText.empty")}
      </p>
    </details>
  );
};

export const AnalyzeDraft = ({ taskId }: { taskId: number }) => {
  const { t } = useTranslation();
  const analysis = useAnalyzeDraft(taskId);

  return (
    <Stack gap="md" className="max-w-3xl">
      <p className="text-muted-foreground text-sm">
        {t("builder.analyze.hint")}
      </p>
      <div>
        <Button
          type="button"
          onClick={analysis.analyze}
          disabled={analysis.pending}
          aria-busy={analysis.pending}
        >
          {analysis.pending && <Spinner />}
          {t(
            analysis.pending
              ? "builder.analyze.pending"
              : "builder.analyze.submit"
          )}
        </Button>
      </div>
      {analysis.error && (
        <p role="alert" className={formError}>
          {analysis.error}
        </p>
      )}
    </Stack>
  );
};
