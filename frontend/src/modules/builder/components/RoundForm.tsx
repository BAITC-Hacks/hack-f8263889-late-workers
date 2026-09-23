import { Section, Stack } from "@/common/components/layout";
import { Badge, Button } from "@/common/components/ui";
import { cn } from "@/common/lib/utils";
import { field, fieldError, formError } from "@/common/styles";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  ANSWER_MAX,
  type AnswersFormValues,
  answersPhaseKey,
  blockNameKey,
} from "../helpers";
import { useAnswersForm } from "../hooks/useAnswersForm";
import type { BuilderTask, Round, RoundQuestion } from "../types";
import { CharCount, LoadingOverlay } from "./Feedback";

type QuestionFieldProps = {
  question: RoundQuestion;
  index: number;
  form: UseFormReturn<AnswersFormValues>;
  onToggleSkip: () => void;
};

const QuestionField = ({
  question,
  index,
  form,
  onToggleSkip,
}: QuestionFieldProps) => {
  const { t } = useTranslation();
  const [answer, skipped] = useWatch({
    control: form.control,
    name: [`answers.${index}.answer`, `answers.${index}.skipped`],
  });
  const error = form.formState.errors.answers?.[index]?.answer?.message;
  const id = `answer-${question.id}`;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Badge variant="muted">{t(blockNameKey(question.block))}</Badge>
      <label htmlFor={id} className="block text-sm font-medium">
        {question.text}
      </label>
      <textarea
        id={id}
        rows={3}
        disabled={skipped}
        placeholder={skipped ? t("builder.questions.skipped") : undefined}
        className={field}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...form.register(`answers.${index}.answer`)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleSkip}
        >
          {t(skipped ? "builder.questions.answer" : "builder.questions.skip")}
        </Button>
        <CharCount value={answer.length} max={ANSWER_MAX} />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className={fieldError}>
          {error}
        </p>
      )}
    </div>
  );
};

type RoundFormProps = { task: BuilderTask; round: Round };

export const RoundForm = ({ task, round }: RoundFormProps) => {
  const { t } = useTranslation();
  const answers = useAnswersForm(task, round);
  const busy = answers.phase !== null;

  return (
    <>
      <Section
        title={t("builder.questions.title")}
        description={t("builder.questions.roundTitle", {
          number: round.number,
        })}
        divider={false}
      >
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="space-y-4"
        >
          {round.questions.map((question, index) => (
            <QuestionField
              key={question.id}
              question={question}
              index={index}
              form={answers.form}
              onToggleSkip={() => answers.toggleSkip(index)}
            />
          ))}
          {answers.message && (
            <p role="alert" className={formError}>
              {answers.message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {task.roundsLeft > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void answers.submit("round")}
              >
                {t("builder.questions.more", { left: task.roundsLeft })}
              </Button>
            )}
            <Button
              type="button"
              disabled={busy}
              onClick={() => void answers.submit("card")}
            >
              {t("builder.questions.build")}
            </Button>
          </div>
        </form>
      </Section>
      {/* Outside Section: its entry animation transforms it, which would pin a fixed overlay to it. */}
      {answers.phase && (
        <LoadingOverlay text={t(answersPhaseKey(answers.phase))} />
      )}
    </>
  );
};

export const PastRounds = ({ rounds }: { rounds: Round[] }) => {
  const { t } = useTranslation();
  if (rounds.length === 0) return null;

  return (
    <Stack gap="sm">
      {rounds.map((round) => (
        <details key={round.number} className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            {t("builder.questions.roundTitle", { number: round.number })}
          </summary>
          <dl className="divide-y border-t">
            {round.questions.map((question) => (
              <div key={question.id} className="space-y-1 px-4 py-3">
                <dt className="text-sm font-medium">{question.text}</dt>
                <dd
                  className={cn(
                    "text-sm whitespace-pre-line",
                    !question.answer && "text-muted-foreground"
                  )}
                >
                  {question.answer || t("builder.questions.noAnswer")}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </Stack>
  );
};
