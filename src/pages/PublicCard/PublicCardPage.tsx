import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
import { ApiError } from "../../services/api";
import "./PublicCardPage.css";

const SPECIES_LABELS: Record<string, string> = {
  DOG: "Cachorro",
  CAT: "Gato",
  BIRD: "Ave",
  OTHER: "Outro",
};

const SEX_LABELS: Record<string, string> = {
  MALE: "Macho",
  FEMALE: "Fêmea",
};

function formatDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function calculateAge(birthDate: string | undefined): string | null {
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
    const yearsPart = years === 1 ? "1 ano" : `${years} anos`;
    if (months === 0) return yearsPart;
    const monthsPart = months === 1 ? "1 mês" : `${months} meses`;
    return `${yearsPart} e ${monthsPart}`;
  }
  if (totalMonths > 0)
    return totalMonths === 1 ? "1 mês" : `${totalMonths} meses`;
  return "Menos de 1 mês";
}

function VaccineTable({ vaccines }: { vaccines: VaccineRecordResponseDto[] }) {
  if (vaccines.length === 0) {
    return <p className="empty-section">Nenhuma vacina registrada.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Vacina</th>
            <th>Data de aplicação</th>
            <th>Próxima dose</th>
            <th>Veterinário</th>
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
  if (dewormings.length === 0) {
    return <p className="empty-section">Nenhuma vermifugação registrada.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Data de aplicação</th>
            <th>Próxima dose</th>
            <th>Veterinário</th>
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
  if (medications.length === 0) {
    return <p className="empty-section">Nenhuma medicação registrada.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Medicação</th>
            <th>Dosagem</th>
            <th>Frequência</th>
            <th>Início</th>
            <th>Término</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((m) => (
            <tr key={m.id}>
              <td>{m.medication_name}</td>
              <td>{m.dosage}</td>
              <td>{m.frequency}</td>
              <td>{formatDate(m.start_date)}</td>
              <td>{m.end_date ? formatDate(m.end_date) : "Em andamento"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function PublicCardPage() {
  const { token } = useParams<{ token: string }>();
  const [card, setCard] = useState<CarteiraDigitalPublicResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "network" | null>(null);

  useEffect(() => {
    if (!token || !UUID_RE.test(token)) {
      setError("not_found");
      setIsLoading(false);
      return;
    }

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

  if (isLoading) {
    return (
      <div className="card-page">
        <div className="loading">
          <div className="spinner" />
          <p>Carregando carteira digital...</p>
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
          <h1>Carteira não encontrada</h1>
          <p>
            O link acessado não corresponde a nenhuma carteira digital
            cadastrada. Verifique se o link está correto.
          </p>
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
          <h1>Erro ao carregar</h1>
          <p>
            Não foi possível carregar a carteira digital. Tente novamente em
            alguns instantes.
          </p>
          <button
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const age = calculateAge(card.birth_date);
  const speciesLabel = SPECIES_LABELS[card.species] ?? card.species;
  const sexLabel = SEX_LABELS[card.sex] ?? card.sex;

  return (
    <div className="card-page">
      <header className="card-header">
        <div className="brand">
          <span className="brand-icon">
            <IoPawOutline size={24} />
          </span>
          <span className="brand-name">PetCard</span>
        </div>
        <span className="badge">Carteira Digital</span>
      </header>

      <main className="card-content">
        {/* Pet profile */}
        <section className="pet-profile">
          <div className="pet-avatar-wrapper">
            {card.photo_url ? (
              <img
                src={card.photo_url}
                alt={`Foto de ${card.pet_name}`}
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
              Tutor: <strong>{card.tutor_name}</strong>
            </p>
          </div>
        </section>

        {/* QR Code */}
        {card.qr_code_url && (
          <section className="qr-section">
            <img
              src={card.qr_code_url}
              alt="QR Code da carteira digital"
              className="qr-image"
            />
          </section>
        )}

        {/* Health records */}
        <section className="health-section">
          <h2 className="section-title">
            <IoMedkitOutline className="section-icon" size={20} />
            Vacinas
            <span className="count-badge">{card.vaccines.length}</span>
          </h2>
          <VaccineTable vaccines={card.vaccines} />
        </section>

        <section className="health-section">
          <h2 className="section-title">
            <IoBugOutline className="section-icon" size={20} />
            Vermifugações
            <span className="count-badge">{card.dewormings.length}</span>
          </h2>
          <DewormingTable dewormings={card.dewormings} />
        </section>

        <section className="health-section">
          <h2 className="section-title">
            <IoBandageOutline className="section-icon" size={20} />
            Medicações
            <span className="count-badge">{card.medications.length}</span>
          </h2>
          <MedicationTable medications={card.medications} />
        </section>
      </main>

      <footer className="card-footer">
        <p>
          Carteira digital gerada pelo <strong>PetCard</strong> — saúde do seu
          pet em um só lugar.
        </p>
      </footer>
    </div>
  );
}
