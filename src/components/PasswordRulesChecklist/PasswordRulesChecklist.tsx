import { useTranslation } from "react-i18next";
import { IoCheckmarkCircle, IoEllipseOutline } from "react-icons/io5";
import {
  PASSWORD_RULES,
  checkPasswordRules,
} from "../../utils/passwordStrength";
import "./PasswordRulesChecklist.css";

interface Props {
  password: string;
}

/**
 * Listinha ao vivo das regras de senha forte. Cada regra começa cinza e fica
 * verde assim que a senha digitada a cumpre.
 */
export function PasswordRulesChecklist({ password }: Props) {
  const { t } = useTranslation();
  const status = checkPasswordRules(password);

  return (
    <ul className="password-rules" aria-label={t("passwordRules.hint")}>
      {PASSWORD_RULES.map((rule) => {
        const met = status[rule.id];
        return (
          <li
            key={rule.id}
            className={met ? "password-rule met" : "password-rule"}
            data-met={met}
          >
            {met ? (
              <IoCheckmarkCircle size={16} />
            ) : (
              <IoEllipseOutline size={16} />
            )}
            <span>{t(`passwordRules.checklist.${rule.id}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}
