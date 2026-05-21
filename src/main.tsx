import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";

import "./i18n";
import { PublicCardPage } from "./pages/PublicCard/PublicCardPage";
import { NotFoundPage } from "./pages/NotFound/NotFoundPage";

import "./index.css";
import "./pages/PublicCard/PublicCardPage.css";

function getLegacyPublicCardPath(pathname: string): string | null {
  const normalizedPath = pathname.replace(/\/+$/, "");

  if (/^\/[0-9a-z-]+$/i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (/^\/card\/[0-9a-z-]+$/i.test(normalizedPath)) {
    return normalizedPath;
  }

  return null;
}

function normalizePublicCardLocation(): void {
  if (typeof window === "undefined" || window.location.hash) {
    return;
  }

  const publicCardPath = getLegacyPublicCardPath(window.location.pathname);
  if (!publicCardPath) {
    return;
  }

  const search = window.location.search ?? "";
  window.history.replaceState(null, "", `/${search}#${publicCardPath}`);
}

normalizePublicCardLocation();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/card/:token" element={<PublicCardPage />} />
        <Route path="/:token" element={<PublicCardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
