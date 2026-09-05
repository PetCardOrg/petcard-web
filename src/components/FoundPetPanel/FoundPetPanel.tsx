import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoLocationOutline, IoCheckmarkCircleOutline } from "react-icons/io5";

import { registrarLeitura } from "../../services/scan.service";
import type { CoordenadasCompartilhadas } from "../../services/scan.service";
import "./FoundPetPanel.css";

/** Teto de espera pelo GPS antes de avisar o tutor sem a localização. */
const GEOLOCATION_TIMEOUT_MS = 10_000;

type Estado =
  | { fase: "inicial" }
  | { fase: "enviando" }
  | { fase: "enviado"; comLocalizacao: boolean }
  | { fase: "erro" };

type FoundPetPanelProps = {
  token: string;
  petName: string;
};

/**
 * Pede a localização de quem encontrou o pet e avisa o tutor.
 *
 * A permissão do navegador só é pedida no clique, nunca ao abrir a página: um
 * diálogo de GPS sem contexto é negado por reflexo, e navegador nenhum aceita
 * `getCurrentPosition` sem gesto do usuário em contexto não confiável.
 */
export function FoundPetPanel({ token, petName }: FoundPetPanelProps) {
  const { t } = useTranslation();
  const [estado, setEstado] = useState<Estado>({ fase: "inicial" });

  /**
   * Resolve com as coordenadas, ou com `undefined` se a pessoa recusar, o GPS
   * falhar ou o navegador não suportar. Nunca rejeita: recusar a localização
   * não pode impedir o aviso de que o pet foi encontrado.
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

  async function avisarTutor() {
    setEstado({ fase: "enviando" });
    const coordenadas = await obterLocalizacao();

    try {
      await registrarLeitura(token, coordenadas);
      setEstado({ fase: "enviado", comLocalizacao: coordenadas !== undefined });
    } catch {
      setEstado({ fase: "erro" });
    }
  }

  if (estado.fase === "enviado") {
    return (
      <section className="found-pet found-pet-done">
        <span className="found-pet-icon">
          <IoCheckmarkCircleOutline size={22} />
        </span>
        <div>
          <p className="found-pet-title">
            {t("publicCard.foundPet.sentTitle", { name: petName })}
          </p>
          <p className="found-pet-text">
            {estado.comLocalizacao
              ? t("publicCard.foundPet.sentWithLocation")
              : t("publicCard.foundPet.sentWithoutLocation")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="found-pet">
      <span className="found-pet-icon">
        <IoLocationOutline size={22} />
      </span>
      <div className="found-pet-body">
        <p className="found-pet-title">
          {t("publicCard.foundPet.title", { name: petName })}
        </p>
        <p className="found-pet-text">{t("publicCard.foundPet.description")}</p>
        <button
          type="button"
          className="found-pet-btn"
          onClick={() => void avisarTutor()}
          disabled={estado.fase === "enviando"}
        >
          {estado.fase === "enviando"
            ? t("publicCard.foundPet.sending")
            : t("publicCard.foundPet.action")}
        </button>
        {estado.fase === "erro" && (
          <p className="found-pet-error" role="alert">
            {t("publicCard.foundPet.failed")}
          </p>
        )}
      </div>
    </section>
  );
}
