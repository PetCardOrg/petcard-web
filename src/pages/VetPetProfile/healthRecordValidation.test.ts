import { describe, expect, it } from "vitest";
import {
  emptyForm,
  hasQuantity,
  isValidDate,
  validate,
  type HealthRecordForm,
} from "./healthRecordValidation";

function form(overrides: Partial<HealthRecordForm> = {}): HealthRecordForm {
  return { ...emptyForm(), ...overrides };
}

const ONTEM = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
const AMANHA = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

describe("isValidDate", () => {
  it("aceita data real", () => {
    expect(isValidDate("2026-03-10")).toBe(true);
  });

  it("recusa dia que não existe no mês", () => {
    // O input date do navegador não deixa digitar isso, mas o valor pode vir
    // de outro caminho — a validação não pode depender do widget.
    expect(isValidDate("2026-02-31")).toBe(false);
  });

  it("recusa texto livre", () => {
    expect(isValidDate("amanhã")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("hasQuantity", () => {
  it("aceita dose com número", () => {
    expect(hasQuantity("250mg")).toBe(true);
  });

  it("recusa dose sem número", () => {
    expect(hasQuantity("bastante")).toBe(false);
  });
});

describe("validate — medicação", () => {
  it("aprova um preenchimento correto", () => {
    expect(
      validate(
        "medication",
        form({ name: "Amoxicilina", dosage: "250mg", frequency: "12/12h" }),
      ),
    ).toEqual({});
  });

  it("exige nome, dosagem e frequência", () => {
    const errors = validate("medication", form());
    expect(errors.name).toBe("required");
    expect(errors.dosage).toBe("required");
    expect(errors.frequency).toBe("required");
  });

  it("recusa dosagem sem quantidade", () => {
    const errors = validate(
      "medication",
      form({ name: "Amoxicilina", dosage: "bastante", frequency: "12/12h" }),
    );
    expect(errors.dosage).toBe("dosageNeedsNumber");
  });

  it("recusa término antes do início", () => {
    const errors = validate(
      "medication",
      form({
        name: "Amoxicilina",
        dosage: "250mg",
        frequency: "12/12h",
        start_date: "2026-03-10",
        end_date: "2026-03-01",
      }),
    );
    expect(errors.end_date).toBe("endBeforeStart");
  });

  it("não cobra data de aplicação, que é campo de vacina", () => {
    const errors = validate(
      "medication",
      form({
        name: "Amoxicilina",
        dosage: "250mg",
        frequency: "12/12h",
        applied_at: "",
      }),
    );
    expect(errors.applied_at).toBeUndefined();
  });
});

describe("validate — vacina e vermífugo", () => {
  it("aprova um preenchimento correto", () => {
    expect(
      validate("vaccine", form({ name: "Raiva", applied_at: ONTEM })),
    ).toEqual({});
  });

  it("recusa aplicação no futuro", () => {
    // Vacina registra o que já foi aplicado.
    const errors = validate(
      "vaccine",
      form({ name: "Raiva", applied_at: AMANHA }),
    );
    expect(errors.applied_at).toBe("appliedInFuture");
  });

  it("recusa próxima dose antes da aplicação", () => {
    const errors = validate(
      "deworming",
      form({
        name: "Drontal",
        applied_at: "2026-03-10",
        next_dose_at: "2026-03-01",
      }),
    );
    expect(errors.next_dose_at).toBe("nextDoseBeforeApplied");
  });

  it("aceita próxima dose vazia", () => {
    const errors = validate(
      "deworming",
      form({ name: "Drontal", applied_at: ONTEM, next_dose_at: "" }),
    );
    expect(errors.next_dose_at).toBeUndefined();
  });

  it("não cobra dosagem, que é campo de medicação", () => {
    const errors = validate(
      "vaccine",
      form({ name: "Raiva", applied_at: ONTEM }),
    );
    expect(errors.dosage).toBeUndefined();
  });
});
