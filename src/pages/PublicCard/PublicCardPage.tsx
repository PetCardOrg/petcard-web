import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type {
  CarteiraDigitalPublicResponseDto,
  DewormingRecordResponseDto,
  MedicationRecordResponseDto,
  VaccineRecordResponseDto,
} from "@petcardorg/shared";
import {
  IoPawOutline,
  IoMedkitOutline,
  IoBugOutline,
  IoBandageOutline,
  IoSearchOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";

import { getPublicCard } from "../../services/card.service";
import { adicionarPetAtendido } from "../../services/dashboard.service";
import { ApiError } from "../../services/api";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/LanguageSwitcher";
import { CrmvAviso } from "../../components/CrmvAviso/CrmvAviso";
import { useAuth } from "../../hooks/useAuth";
import { lerRedirecionamentoVet } from "../vetAuthRedirect";
import "./PublicCardPage.css";

function formatDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function useCalculateAge(birthDate: string | undefined): string | null {
  const { t } = useTranslation();

  if (!birthDate) return null;
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  if (birth > today) return null;

  let totalMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    today.getMonth() -
    birth.getMonth();
  if (today.getDate() < birth.getDate()) totalMonths -= 1;

  if (totalMonths >= 12) {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const yearsPart = t("age.year", { count: years });
    if (months === 0) return yearsPart;
    const monthsPart = t("age.month", { count: months });
    return t("age.yearsAndMonths", { years: yearsPart, months: monthsPart });
  }
  if (totalMonths > 0) return t("age.month", { count: totalMonths });
  return t("age.lessThanOneMonth");
}

function VaccineTable({ vaccines }: { vaccines: VaccineRecordResponseDto[] }) {
  const { t } = useTranslation();

  if (vaccines.length === 0) {
    return <p className="empty-section">{t("publicCard.empty.vaccines")}</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{t("publicCard.table.vaccine")}</th>
            <th>{t("publicCard.table.applicationDate")}</th>
            <th>{t("publicCard.table.nextDose")}</th>
            <th>{t("publicCard.table.veterinarian")}</th>
          </tr>
        </thead>
        <tbody>
          {vaccines.map((v) => (
            <tr key={v.id}>
              <td>{v.vaccine_name}</td>
              <td>{formatDate(v.applied_at)}</td>
              <td>{v.next_dose_at ? formatDate(v.next_dose_at) : "—"}</td>
              <td>{v.veterinarian_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DewormingTable({
  dewormings,
}: {
  dewormings: DewormingRecordResponseDto[];
}) {
  const { t } = useTranslation();

  if (dewormings.length === 0) {
    return <p className="empty-section">{t("publicCard.empty.dewormings")}</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{t("publicCard.table.product")}</th>
            <th>{t("publicCard.table.applicationDate")}</th>
            <th>{t("publicCard.table.nextDose")}</th>
            <th>{t("publicCard.table.veterinarian")}</th>
          </tr>
        </thead>
        <tbody>
          {dewormings.map((d) => (
            <tr key={d.id}>
              <td>{d.product_name}</td>
              <td>{formatDate(d.applied_at)}</td>
              <td>{d.next_dose_at ? formatDate(d.next_dose_at) : "—"}</td>
              <td>{d.veterinarian_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MedicationTable({
  medications,
}: {
  medications: MedicationRecordResponseDto[];
}) {
  const { t } = useTranslation();

  if (medications.length === 0) {
    return <p className="empty-section">{t("publicCard.empty.medications")}</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{t("publicCard.table.medication")}</th>
            <th>{t("publicCard.table.dosage")}</th>
            <th>{t("publicCard.table.frequency")}</th>
            <th>{t("publicCard.table.startDate")}</th>
            <th>{t("publicCard.table.endDate")}</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((m) => (
            <tr key={m.id}>
              <td>{m.medication_name}</td>
              <td>{m.dosage}</td>
              <td>{m.frequency}</td>
              <td>{formatDate(m.start_date)}</td>
              <td>
                {m.end_date
                  ? formatDate(m.end_date)
                  : t("publicCard.table.ongoing")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PublicCardPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: authToken, user } = useAuth();
  const [card, setCard] = useState<CarteiraDigitalPublicResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "network" | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);
  const [crmvBloqueado, setCrmvBloqueado] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("not_found");
      setIsLoading(false);
      return;
    }

    setCard(null);
    setError(null);
    setIsLoading(true);

    let cancelled = false;

    (async () => {
      try {
        const data = await getPublicCard(token);
        if (!cancelled) setCard(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("not_found");
        } else {
          setError("network");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  /**
   * Põe o pet na lista do veterinário e abre o prontuário.
   *
   * Ter lido o QR é o que autoriza o atendimento: a lista do dashboard é um
   * vínculo guardado, não uma dedução dos registros clínicos (api#130).
   */
  const entrarComoVet = useCallback(async () => {
    if (!token || !card) return;
    if (!authToken) {
      // Volta para cá depois do login, não direto para o prontuário: é aqui
      // que o vínculo é criado.
      navigate("/vet/login", {
        state: { redirectTo: `/card/${token}`, acessoVet: true },
      });
      return;
    }

    setEntrando(true);
    setErroAcesso(null);
    setCrmvBloqueado(false);
    try {
      await adicionarPetAtendido(authToken, token);
      navigate(`/vet/pets/${card.pet_id}`);
    } catch (err) {
      // CRMV pendente não é falha: é um passo que falta, e o vet resolve
      // sem sair da tela.
      if (err instanceof ApiError && err.isCrmvNaoVerificado) {
        setCrmvBloqueado(true);
        return;
      }
      setErroAcesso(t("publicCard.vetAccess.failed"));
    } finally {
      setEntrando(false);
    }
  }, [authToken, card, navigate, t, token]);

  // Quem chegou aqui vindo do login ou do cadastro já pediu para entrar como
  // veterinário; repetir o clique seria só atrito.
  const pediuAcessoVet = Boolean(
    lerRedirecionamentoVet(location.state).acessoVet,
  );
  useEffect(() => {
    if (pediuAcessoVet && authToken && card) {
      void entrarComoVet();
    }
  }, [pediuAcessoVet, authToken, card, entrarComoVet]);

  const age = useCalculateAge(card?.birth_date);

  if (isLoading) {
    return (
      <div className="card-page">
        <div className="loading">
          <div className="spinner" />
          <p>{t("publicCard.loading")}</p>
        </div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="card-page">
        <div className="error-state">
          <div className="error-icon">
            <IoSearchOutline size={48} />
          </div>
          <h1>{t("publicCard.notFound.title")}</h1>
          <p>{t("publicCard.notFound.description")}</p>
        </div>
      </div>
    );
  }

  if (error === "network" || !card) {
    return (
      <div className="card-page">
        <div className="error-state">
          <div className="error-icon">
            <IoAlertCircleOutline size={48} />
          </div>
          <h1>{t("publicCard.networkError.title")}</h1>
          <p>{t("publicCard.networkError.description")}</p>
          <button
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            {t("publicCard.networkError.retry")}
          </button>
        </div>
      </div>
    );
  }

  const speciesLabel = t(`species.${card.species}`, {
    defaultValue: card.species,
  });
  const sexLabel = t(`sex.${card.sex}`, { defaultValue: card.sex });

  return (
    <div className="card-page">
      <header className="card-header">
        <div className="brand">
          <span className="brand-icon">
            <IoPawOutline size={24} />
          </span>
          <span className="brand-name">{t("brand.name")}</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <span className="badge">{t("brand.badge")}</span>
        </div>
      </header>

      <main className="card-content">
        {/* Pet profile */}
        <section className="pet-profile">
          <div className="pet-avatar-wrapper">
            {card.photo_url ? (
              <img
                src={card.photo_url}
                alt={card.pet_name}
                className="pet-avatar"
              />
            ) : (
              <div className="pet-avatar-placeholder">
                {speciesLabel.charAt(0)}
              </div>
            )}
          </div>

          <div className="pet-info">
            <h1 className="pet-name">{card.pet_name}</h1>
            {card.breed && <p className="pet-breed">{card.breed}</p>}

            <div className="pet-details">
              <span className="detail-pill species">{speciesLabel}</span>
              <span className="detail-pill">{sexLabel}</span>
              {age && <span className="detail-pill">{age}</span>}
              {card.weight != null && (
                <span className="detail-pill">{card.weight} kg</span>
              )}
            </div>

            <p className="tutor-info">
              {t("publicCard.petProfile.tutor")}:{" "}
              <strong>{card.tutor_name}</strong>
            </p>

            {/* O telefone é o que torna o QR da coleira acionável: quem achou
                o pet liga daqui mesmo. Só aparece se o tutor cadastrou. */}
            {card.tutor_phone && (
              <p className="tutor-info">
                {t("publicCard.petProfile.phone")}:{" "}
                <a
                  className="tutor-phone"
                  href={`tel:${card.tutor_phone.replace(/[^+\d]/g, "")}`}
                >
                  {card.tutor_phone}
                </a>
              </p>
            )}
          </div>
        </section>

        {/* Acesso do veterinário: quem lê o QR pela câmera do celular cai
            aqui, e sem isto não teria como chegar na área do vet. */}
        <section className="vet-access">
          <p className="vet-access-text">{t("publicCard.vetAccess.prompt")}</p>
          <button
            type="button"
            className="vet-access-btn"
            onClick={() => void entrarComoVet()}
            disabled={entrando}
          >
            {entrando
              ? t("publicCard.vetAccess.entering")
              : t("publicCard.vetAccess.action")}
          </button>
          {erroAcesso && <p className="vet-access-error">{erroAcesso}</p>}
          {crmvBloqueado && (
            <CrmvAviso
              token={authToken}
              mensagem={t("publicCard.vetAccess.crmvRequired")}
              crmvAtual={user?.crmv}
              onVerificado={() => void entrarComoVet()}
              className="vet-access-crmv"
            />
          )}
        </section>

        {/* O QR fica só no app do tutor (web#34). Exibi-lo aqui não servia a
            ninguém: quem chega nesta tela já leu o código para chegar. */}

        {/* Health records */}
        <section className="health-section">
          <h2 className="section-title">
            <IoMedkitOutline className="section-icon" size={20} />
            {t("publicCard.sections.vaccines")}
            <span className="count-badge">{card.vaccines.length}</span>
          </h2>
          <VaccineTable vaccines={card.vaccines} />
        </section>

        <section className="health-section">
          <h2 className="section-title">
            <IoBugOutline className="section-icon" size={20} />
            {t("publicCard.sections.dewormings")}
            <span className="count-badge">{card.dewormings.length}</span>
          </h2>
          <DewormingTable dewormings={card.dewormings} />
        </section>

        <section className="health-section">
          <h2 className="section-title">
            <IoBandageOutline className="section-icon" size={20} />
            {t("publicCard.sections.medications")}
            <span className="count-badge">{card.medications.length}</span>
          </h2>
          <MedicationTable medications={card.medications} />
        </section>
      </main>

      <footer className="card-footer">
        {/* <Trans> monta o <strong> como elemento React. Injetar a tradução
            como HTML abria um caminho de XSS que só não era explorável porque
            a string é nossa — e continuaria aberto se um dia deixasse de ser. */}
        <p>
          <Trans
            i18nKey="publicCard.footer"
            components={{ strong: <strong /> }}
          />
        </p>
      </footer>
    </div>
  );
}
