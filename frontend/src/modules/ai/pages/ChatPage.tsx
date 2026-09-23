import { Footer, Page, Section, Stack } from "@/common/components/layout";
import { inlineLink, pageDescription, pageTitle, prose } from "@/common/styles";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ChatPanel } from "../components/ChatPanel";

export const ChatPage = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <Section divider={false}>
        <Stack gap="lg" className={prose}>
          <Link to="/" className={inlineLink}>
            <ArrowLeft className="h-3 w-3" />
            {t("goHome")}
          </Link>
          <h1 className={pageTitle}>{t("ai.page.title")}</h1>
          <p className={pageDescription}>{t("ai.page.description")}</p>
        </Stack>
      </Section>

      <Section title={t("ai.page.sessionTitle")} delay={0.1}>
        <ChatPanel />
      </Section>

      <Footer />
    </Page>
  );
};
