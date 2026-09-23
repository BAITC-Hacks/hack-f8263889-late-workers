import { Button } from "@/common/components/ui";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const AuthSubmit = ({
  pending,
  action,
}: {
  pending: boolean;
  action: "login" | "register";
}) => {
  const { t } = useTranslation();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full"
    >
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {t(`auth.${action}.${pending ? "submitting" : "submit"}`)}
    </Button>
  );
};
