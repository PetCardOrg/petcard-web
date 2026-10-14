import { describe, expect, it } from "vitest";
import i18n from "../i18n";
import { ApiError } from "./api";
import { apiErrorMessage } from "./apiErrorMessage";

const t = i18n.getFixedT("pt-BR");
const tEn = i18n.getFixedT("en-US");

describe("apiErrorMessage", () => {
  it("nunca devolve o texto da API, que vem em inglês", () => {
    const texto = apiErrorMessage(
      new ApiError(409, "Conflict", "Email already registered"),
      "falhou",
      t,
    );

    expect(texto).not.toContain("Email already registered");
    expect(texto).toBe("Já existe um registro com esses dados.");
  });

  it.each([
    [400, "Confira os dados informados e tente novamente."],
    [403, "Você não tem permissão para fazer isso."],
    [
      404,
      "Não encontramos o que você procura. Atualize a tela e tente de novo.",
    ],
    [
      429,
      "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
    ],
  ])("traduz o status %i", (status, esperado) => {
    expect(
      apiErrorMessage(new ApiError(status, "x", "english"), "falhou", t),
    ).toBe(esperado);
  });

  it("segue o idioma da tela", () => {
    expect(apiErrorMessage(new ApiError(403, "Forbidden"), "failed", tEn)).toBe(
      "You don't have permission to do that.",
    );
  });

  it("usa a mensagem da tela para 5xx, timeout e erros que não são da API", () => {
    expect(
      apiErrorMessage(new ApiError(500, "Server Error"), "Erro ao salvar.", t),
    ).toBe("Erro ao salvar.");
    expect(
      apiErrorMessage(
        new ApiError(0, "Timeout", "Tempo excedido"),
        "Erro ao salvar.",
        t,
      ),
    ).toBe("Erro ao salvar.");
    expect(apiErrorMessage(new Error("boom"), "Erro ao salvar.", t)).toBe(
      "Erro ao salvar.",
    );
  });
});
