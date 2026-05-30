import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";
import {
  IoArrowBack,
  IoQrCode,
  IoAlertCircle,
  IoVideocamOff,
} from "react-icons/io5";
import { getPublicCard } from "../../services/card.service";
import { ApiError } from "../../services/api";
import "./VetScanPage.css";

type ScanState =
  | "idle"
  | "scanning"
  | "resolving"
  | "error"
  | "invalid_qr"
  | "permission_denied"
  | "no_camera";

/**
 * Extracts the card token from a QR code value.
 *
 * Accepts:
 *  - Full URL: https://card.petcard.app/#/abc-123
 *  - Full URL with /card path: https://card.petcard.app/#/card/abc-123
 *  - Hash path: #/abc-123 or #/card/abc-123
 *  - Path: /card/abc-123 or /abc-123
 *  - Raw UUID token: abc-123-def-456
 */
function extractToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try parsing as URL first
  try {
    const url = new URL(trimmed);
    const hash = url.hash;
    if (hash) {
      return extractTokenFromPath(hash.replace(/^#\/?/, "/"));
    }
    return extractTokenFromPath(url.pathname);
  } catch {
    // Not a URL — try as path or raw token
  }

  // Hash fragment
  if (trimmed.startsWith("#")) {
    return extractTokenFromPath(trimmed.replace(/^#\/?/, "/"));
  }

  // Path
  if (trimmed.startsWith("/")) {
    return extractTokenFromPath(trimmed);
  }

  // Raw token (UUID-like)
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function extractTokenFromPath(path: string): string | null {
  const normalized = path.replace(/\/+$/, "");

  // /card/<token>
  const cardMatch = normalized.match(/^\/card\/([0-9a-f-]+)$/i);
  if (cardMatch) return cardMatch[1];

  // /<token>
  const directMatch = normalized.match(/^\/([0-9a-f-]+)$/i);
  if (directMatch) return directMatch[1];

  return null;
}

export function VetScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanup = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scannerState = scannerRef.current.getState();
        if (
          scannerState === 2 /* SCANNING */ ||
          scannerState === 3 /* PAUSED */
        ) {
          await scannerRef.current.stop();
        }
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void cleanup();
    };
  }, [cleanup]);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Pause scanning immediately to prevent duplicate reads
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      if (!mountedRef.current) return;
      setState("resolving");

      const token = extractToken(decodedText);
      if (!token) {
        setState("invalid_qr");
        setErrorMessage(decodedText);
        return;
      }

      try {
        const card = await getPublicCard(token);
        if (!mountedRef.current) return;
        navigate(`/vet/pets/${card.pet_id}`);
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof ApiError && err.status === 404) {
          setState("invalid_qr");
          setErrorMessage(token);
        } else {
          setState("error");
          setErrorMessage(t("vetScan.resolveError"));
        }
      }
    },
    [navigate, t],
  );

  const startScanner = useCallback(async () => {
    setState("scanning");
    setErrorMessage(null);
    await cleanup();

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!mountedRef.current) return;

      if (devices.length === 0) {
        setState("no_camera");
        return;
      }

      const scanner = new Html5Qrcode("vet-scan-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          void handleScanSuccess(decodedText);
        },
        () => {
          // QR not found in frame — do nothing
        },
      );
    } catch (err) {
      if (!mountedRef.current) return;

      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("NotAllowedError") ||
        message.includes("Permission")
      ) {
        setState("permission_denied");
      } else if (
        message.includes("NotFoundError") ||
        message.includes("no camera")
      ) {
        setState("no_camera");
      } else {
        setState("error");
        setErrorMessage(message);
      }
    }
  }, [cleanup, handleScanSuccess]);

  return (
    <div className="vet-scan">
      <header className="vet-scan-header">
        <button
          type="button"
          className="vet-scan-back"
          onClick={() => {
            void cleanup();
            navigate("/vet/dashboard");
          }}
        >
          <IoArrowBack size={20} />
        </button>
        <span className="vet-scan-header-title">{t("vetScan.title")}</span>
      </header>

      <main className="vet-scan-content">
        {state === "idle" && (
          <div className="vet-scan-state-card">
            <div className="vet-scan-state-icon vet-scan-idle-icon">
              <IoQrCode size={36} color="#27a9d8" />
            </div>
            <h3>{t("vetScan.idleTitle")}</h3>
            <p>{t("vetScan.idleDescription")}</p>
            <button type="button" onClick={() => void startScanner()}>
              {t("vetScan.startButton")}
            </button>
          </div>
        )}

        {state === "scanning" && (
          <div className="vet-scan-scanner-wrapper">
            <div id="vet-scan-reader" className="vet-scan-reader" />
            <p className="vet-scan-hint">{t("vetScan.scanHint")}</p>
          </div>
        )}

        {state === "resolving" && (
          <div className="vet-scan-state-card">
            <div className="vet-scan-spinner" />
            <h3>{t("vetScan.resolving")}</h3>
          </div>
        )}

        {state === "invalid_qr" && (
          <div className="vet-scan-state-card">
            <div className="vet-scan-state-icon vet-scan-error-icon">
              <IoAlertCircle size={36} color="#e63946" />
            </div>
            <h3>{t("vetScan.invalidTitle")}</h3>
            <p>{t("vetScan.invalidDescription")}</p>
            {errorMessage && (
              <span className="vet-scan-error-detail">{errorMessage}</span>
            )}
            <button type="button" onClick={() => void startScanner()}>
              {t("vetScan.tryAgain")}
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="vet-scan-state-card">
            <div className="vet-scan-state-icon vet-scan-error-icon">
              <IoAlertCircle size={36} color="#e63946" />
            </div>
            <h3>{t("vetScan.errorTitle")}</h3>
            <p>{errorMessage ?? t("vetScan.errorDescription")}</p>
            <button type="button" onClick={() => void startScanner()}>
              {t("vetScan.tryAgain")}
            </button>
          </div>
        )}

        {state === "permission_denied" && (
          <div className="vet-scan-state-card">
            <div className="vet-scan-state-icon vet-scan-error-icon">
              <IoVideocamOff size={36} color="#e63946" />
            </div>
            <h3>{t("vetScan.permissionDeniedTitle")}</h3>
            <p>{t("vetScan.permissionDeniedDescription")}</p>
            <button type="button" onClick={() => void startScanner()}>
              {t("vetScan.tryAgain")}
            </button>
          </div>
        )}

        {state === "no_camera" && (
          <div className="vet-scan-state-card">
            <div className="vet-scan-state-icon vet-scan-error-icon">
              <IoVideocamOff size={36} color="#e63946" />
            </div>
            <h3>{t("vetScan.noCameraTitle")}</h3>
            <p>{t("vetScan.noCameraDescription")}</p>
            <button type="button" onClick={() => navigate("/vet/dashboard")}>
              {t("vetScan.backToDashboard")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
