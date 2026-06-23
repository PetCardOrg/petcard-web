import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("renderiza título e descrição traduzidos", () => {
    render(<NotFoundPage />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    // As chaves devem resolver para texto (não devolver a própria chave).
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe(
      "notFoundPage.title",
    );
  });
});
