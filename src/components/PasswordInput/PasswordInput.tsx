import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import "./PasswordInput.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Campo de senha com o olhinho para mostrar e ocultar o que foi digitado.
 *
 * Herda o estilo de `.vet-login-field input`; o botão fica por cima do canto
 * direito do campo.
 */
export function PasswordInput(props: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("passwordInput.hide") : t("passwordInput.show")}
        aria-pressed={visible}
        disabled={props.disabled}
      >
        {visible ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
      </button>
    </div>
  );
}
