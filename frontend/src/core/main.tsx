import { ThemeProvider } from "@/modules/theme";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { removeLegacyToken } from "./api";
import "./i18n";
import "./index.css";
import { QueryProvider } from "./query";

removeLegacyToken();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <div role="status" className="min-h-screen" aria-label="Loading" />
        }
      >
        <QueryProvider>
          <ThemeProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemeProvider>
        </QueryProvider>
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
