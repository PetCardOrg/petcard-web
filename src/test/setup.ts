import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import i18n from "../i18n";

// Idioma determinístico para que as asserções de texto não dependam do
// detector de locale do ambiente (navigator/localStorage do jsdom).
await i18n.changeLanguage("pt-BR");

afterEach(() => {
  cleanup();
  localStorage.clear();
});
