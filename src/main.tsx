import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { PublicCardPage } from "./pages/PublicCard/PublicCardPage";
import { NotFoundPage } from "./pages/NotFound/NotFoundPage";

import "./index.css";
import "./pages/PublicCard/PublicCardPage.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:token" element={<PublicCardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
