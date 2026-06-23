import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher";
import i18n from "../../i18n";

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    // Restaura o idioma padrão dentro de act() para não vazar atualizações de
    // estado do i18n para fora do ciclo de render do React.
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });
  });

  it("lista os idiomas suportados e reflete o idioma atual", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox", { name: "Language" });
    expect(select).toHaveValue("pt-BR");
    expect(
      screen.getByRole("option", { name: "Português" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("troca o idioma do i18n ao selecionar outra opção", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Language" }),
      "en-US",
    );
    // Drena a atualização assíncrona disparada pelo evento languageChanged.
    await act(async () => {});

    await waitFor(() => expect(i18n.language).toBe("en-US"));
  });
});
