import { useTranslation } from "react-i18next";

import { type RatingHint, formatGain } from "../helpers";
import type { BlockCode } from "../types";

type RatingHintListProps = {
  hints: RatingHint[];
  onHint: (block: BlockCode) => void;
};

export const RatingHintList = ({ hints, onHint }: RatingHintListProps) => {
  const { t, i18n } = useTranslation();

  return (
    <ul className="space-y-2">
      {hints.map((hint) => (
        <li key={hint.block}>
          <button
            type="button"
            onClick={() => onHint(hint.block)}
            className="text-primary focus-visible:ring-ring rounded-xs text-left text-sm outline-hidden hover:underline focus-visible:ring-1"
          >
            {t("builder.rating.hint", {
              hint: t(hint.textKey),
              gain: formatGain(hint.gain, i18n.language),
            })}
          </button>
        </li>
      ))}
    </ul>
  );
};
