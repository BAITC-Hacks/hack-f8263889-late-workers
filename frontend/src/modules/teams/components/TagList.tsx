import { useTranslation } from "react-i18next";

type TagListProps = {
  tags: string[];
  label: string;
  /** Tags left out of `tags`, shown as `+N`. */
  hidden?: number;
};

export const TagList = ({ tags, label, hidden = 0 }: TagListProps) => {
  const { t } = useTranslation();
  if (tags.length === 0)
    return <p className="text-muted-foreground text-sm">{t("teams.none")}</p>;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="bg-secondary text-secondary-foreground max-w-full rounded-md px-2 py-0.5 text-xs break-words"
        >
          {tag}
        </li>
      ))}
      {hidden > 0 && (
        <li className="text-muted-foreground px-1 py-0.5 text-xs">+{hidden}</li>
      )}
    </ul>
  );
};
