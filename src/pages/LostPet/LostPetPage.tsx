import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoCallOutline,
  IoLocationOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoPawOutline,
  IoSearchOutline,
} from "react-icons/io5";

import {
  getColeiraPublica,
  registrarLeitura,
} from "../../services/coleira.service";
import type {
  ColeiraPublica,
  CoordenadasCompartilhadas,
} from "../../services/coleira.service";
import { ApiError } from "../../services/api";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/LanguageSwitcher";
import "./LostPetPage.css";

/** Teto de espera pelo GPS antes de avisar o tutor sem a localização. */
const GEOLOCATION_TIMEOUT_MS = 15_000;

type EstadoLocalizacao = "pedindo" | "enviada" | "sem_permissao";

/**
 * Resolve com as coordenadas, ou `undefined` se a pessoa recusar, o GPS falhar
 * ou o navegador não suportar. Nunca rejeita: negar a localização não pode
 * impedir o aviso de que o pet foi encontrado.
 */
function obterLocalizacao(): Promise<CoordenadasCompartilhadas | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_meters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : undefined,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS },
    );
  });
}

/**
 * Página que quem encontra o pet abre ao ler o QR da coleira.
 *
 * Só o que ajuda a devolver o animal: identificação do pet, contato do tutor e
 * o que fazer agora. Nada de histórico clínico — é a razão de a coleira ter
 * token próprio, separado do da carteira digital.
 */
export function LostPetPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [pet, setPet] = useState<ColeiraPublica | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "network" | null>(null);
  const [localizacao, setLocalizacao] = useState<EstadoLocalizacao>("pedindo");

  // O aviso é disparado uma vez por abertura. Sem esta trava, o StrictMode do
  // React em dev monta o efeito duas vezes e o tutor receberia dois avisos.
  const jaAvisou = useRef(false);

  useEffect(() => {
    if (!token) {
      setError("not_found");
      setIsLoading(false);
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const data = await getColeiraPublica(token);
        if (!cancelado) setPet(data);
      } catch (err) {
        if (cancelado) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "not_found"
            : "network",
        );
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const avisarTutor = useCallback(async () => {
    if (!token) return;
    const coordenadas = await obterLocalizacao();

    try {
      await registrarLeitura(token, coordenadas);
    } catch {
      // O aviso é secundário para quem está com o animal na mão: o telefone do
      // tutor continua na tela e é o que resolve. Empurrar um erro técnico
      // para cima de quem quer ajudar não melhora nada.
    }
    setLocalizacao(coordenadas ? "enviada" : "sem_permissao");
  }, [token]);

  // Dispara assim que a página carrega, sem botão: quem está com o animal na
  // rua não deveria ter que descobrir onde clicar, e o diálogo do navegador já
  // é o consentimento. No iOS o pedido automático é inconstante — daí o botão
  // de resgate que aparece quando não vem localização.
  useEffect(() => {
    if (!pet || jaAvisou.current) return;
    jaAvisou.current = true;
    void avisarTutor();
  }, [pet, avisarTutor]);

  if (isLoading) {
    return (
      <div className="lost-page">
        <div className="lost-loading">
          <div className="spinner" />
          <p>{t("lostPet.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="lost-page">
        <div className="lost-error">
          <IoSearchOutline size={48} />
          <h1>
            {error === "not_found"
              ? t("lostPet.notFound.title")
              : t("lostPet.networkError.title")}
          </h1>
          <p>
            {error === "not_found"
              ? t("lostPet.notFound.description")
              : t("lostPet.networkError.description")}
          </p>
        </div>
      </div>
    );
  }

  const telefoneLimpo = pet.tutor_phone?.replace(/[^+\d]/g, "");
  const speciesLabel = t(`species.${pet.species}`, {
    defaultValue: pet.species,
  });

  return (
    <div className="lost-page">
      <header className="lost-header">
        <span className="lost-brand">
          <IoPawOutline size={20} />
          {t("brand.name")}
        </span>
        <LanguageSwitcher />
      </header>

      {/* Primeira coisa na tela: o que aconteceu e o que fazer. */}
      <section className="lost-hero">
        <h1 className="lost-title">
          {t("lostPet.hero.title", { name: pet.pet_name })}
        </h1>
        <p className="lost-lead">
          {t("lostPet.hero.lead", { name: pet.pet_name })}
        </p>
      </section>

      <section className="lost-pet">
        {pet.photo_url ? (
          <img className="lost-photo" src={pet.photo_url} alt={pet.pet_name} />
        ) : (
          <div className="lost-photo lost-photo-placeholder">
            <IoPawOutline size={36} />
          </div>
        )}
        <div className="lost-pet-info">
          <h2 className="lost-pet-name">{pet.pet_name}</h2>
          <div className="lost-pills">
            <span className="lost-pill">{speciesLabel}</span>
            {pet.breed && <span className="lost-pill">{pet.breed}</span>}
            <span className="lost-pill">
              {t(`sex.${pet.sex}`, { defaultValue: pet.sex })}
            </span>
          </div>
        </div>
      </section>

      {/* O telefone é a ação principal da página. */}
      <section className="lost-contact">
        <p className="lost-contact-label">
          {t("lostPet.contact.label", { name: pet.tutor_name })}
        </p>
        {telefoneLimpo ? (
          <a className="lost-call-btn" href={`tel:${telefoneLimpo}`}>
            <IoCallOutline size={22} />
            <span>{t("lostPet.contact.call", { phone: pet.tutor_phone })}</span>
          </a>
        ) : (
          <p className="lost-no-phone">{t("lostPet.contact.noPhone")}</p>
        )}
      </section>

      <section
        className={`lost-location lost-location-${localizacao}`}
        aria-live="polite"
      >
        {localizacao === "pedindo" && (
          <>
            <IoLocationOutline size={20} />
            <p>{t("lostPet.location.asking")}</p>
          </>
        )}
        {localizacao === "enviada" && (
          <>
            <IoCheckmarkCircle size={20} />
            <p>{t("lostPet.location.sent", { name: pet.tutor_name })}</p>
          </>
        )}
        {localizacao === "sem_permissao" && (
          <div className="lost-location-retry">
            <div className="lost-location-retry-text">
              <IoAlertCircleOutline size={20} />
              <p>{t("lostPet.location.denied", { name: pet.tutor_name })}</p>
            </div>
            {/* Resgate para o iOS, onde o pedido automático costuma não vir, e
                para quem negou sem querer. */}
            <button
              type="button"
              className="lost-location-btn"
              onClick={() => void avisarTutor()}
            >
              {t("lostPet.location.retry")}
            </button>
          </div>
        )}
      </section>

      <section className="lost-steps">
        <h3 className="lost-steps-title">{t("lostPet.steps.title")}</h3>
        <ol className="lost-steps-list">
          <li>{t("lostPet.steps.one")}</li>
          <li>{t("lostPet.steps.two")}</li>
          <li>{t("lostPet.steps.three")}</li>
        </ol>
      </section>

      <footer className="lost-footer">
        <p>{t("lostPet.footer")}</p>
      </footer>
    </div>
  );
}
