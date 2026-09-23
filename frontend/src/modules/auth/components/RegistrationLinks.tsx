import { inlineLink } from "@/common/styles";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export const RegistrationLinks = ({
  role,
}: {
  role: "business" | "student";
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-6 space-y-3 border-t pt-6 text-sm">
      <p className="text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className={inlineLink}>
          {t("auth.register.loginCta")}
        </Link>
      </p>
      <Link
        to={role === "business" ? "/register/student" : "/register/business"}
        className={inlineLink}
      >
        {t(
          role === "business"
            ? "auth.register.studentLink"
            : "auth.register.businessLink"
        )}
      </Link>
    </div>
  );
};
