import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";

import "./i18n";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { PublicCardPage } from "./pages/PublicCard/PublicCardPage";
import { VetLoginPage } from "./pages/VetLogin/VetLoginPage";
import { VetDashboardPage } from "./pages/VetDashboard/VetDashboardPage";
import { VetPetProfilePage } from "./pages/VetPetProfile/VetPetProfilePage";
import { VetScanPage } from "./pages/VetScan/VetScanPage";
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
      <AuthProvider>
        <Routes>
          <Route path="/card/:token" element={<PublicCardPage />} />
          <Route path="/vet/login" element={<VetLoginPage />} />
          <Route
            path="/vet/dashboard"
            element={
              <ProtectedRoute>
                <VetDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/pets/:id"
            element={
              <ProtectedRoute>
                <VetPetProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/scan"
            element={
              <ProtectedRoute>
                <VetScanPage />
              </ProtectedRoute>
            }
          />
          <Route path="/:token" element={<PublicCardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
