import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** "Dra. Camila Ferreira — CRMV-SP 12345", ou só o nome quando não há CRMV. */
function assinatura(nome: string, crmv?: string): string {
  return crmv ? `${nome} — ${crmv}` : nome;
}

/**
 * Card de vacina, vermifugação ou medicação nas abas do perfil. As datas
 * chegam já formatadas; ações e anexos dependem do estado da página e vêm
 * prontos.
 */
export function RecordCard({
  titulo,
  data,
  detalhe,
  veterinario,
  crmv,
  proximaDose,
  notes,
  acoes,
  anexos,
}: {
  titulo: string;
  data: string;
  detalhe?: string;
  veterinario?: string;
  crmv?: string;
  proximaDose?: string;
  notes?: string;
  acoes: ReactNode;
  anexos: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="vet-section-card">
      <div className="vet-section-card-header">
        <span className="vet-section-card-title">{titulo}</span>
        <span className="vet-section-card-date">{data}</span>
      </div>
      {detalhe && <span className="vet-section-card-sub">{detalhe}</span>}
      {veterinario && (
        <span className="vet-section-card-sub">
          {assinatura(veterinario, crmv)}
        </span>
      )}
      {proximaDose && (
        <span className="vet-section-card-sub">
          {t("petProfile.nextDose")}: {proximaDose}
        </span>
      )}
      {notes && <p className="vet-section-card-notes">{notes}</p>}
      {acoes}
      {anexos}
    </div>
  );
}
