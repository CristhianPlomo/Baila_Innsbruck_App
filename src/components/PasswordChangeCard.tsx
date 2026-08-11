import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Account } from "../lib/account";
import { minimumPasswordLength, isStrongPassword } from "../lib/password-policy";
import { supabase } from "../lib/supabase";

function authErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim() && message !== "{}") return message;
  }
  return fallback;
}

export default function PasswordChangeCard({ account, variant = "user" }: { account: Account; variant?: "user" | "admin" }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isAdminVariant = variant === "admin";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus("error");
      setMessage(t("userSettings.passwordChange.required"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage(t("passwordRecovery.mismatch"));
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setStatus("error");
      setMessage(t("passwordWeak"));
      return;
    }
    if (currentPassword === newPassword) {
      setStatus("error");
      setMessage(t("userSettings.passwordChange.mustDiffer"));
      return;
    }
    if (!supabase) {
      setStatus("error");
      setMessage(t("passwordRecovery.unavailable"));
      return;
    }

    setStatus("loading");
    try {
      const { error: reauthenticationError } = await supabase.auth.signInWithPassword({ email: account.email, password: currentPassword });
      if (reauthenticationError) {
        setStatus("error");
        setMessage(t("userSettings.passwordChange.currentInvalid"));
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setStatus("error");
        setMessage(authErrorMessage(error, t("userSettings.passwordChange.failed")));
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("success");
      setMessage(t("userSettings.passwordChange.success"));
    } catch (error) {
      setStatus("error");
      setMessage(authErrorMessage(error, t("userSettings.passwordChange.failed")));
    }
  }

  return <section className={isAdminVariant ? "admin-settings-section admin-password-change-card" : "user-settings-card password-change-card"}>
    <header className={isAdminVariant ? "admin-settings-section-heading" : undefined}>
      <span className={isAdminVariant ? "admin-settings-icon gold" : "settings-card-icon"}><ShieldCheck size={19} /></span>
      <div><p className="eyebrow">{t("userSettings.securityEyebrow")}</p><h2>{t("userSettings.securityTitle")}</h2><p>{t("userSettings.securityCopy")}</p></div>
    </header>
    <form className="password-change-form" onSubmit={handleSubmit}>
      <label htmlFor={`${variant}-current-account-password`}>{t("userSettings.passwordChange.currentPassword")}</label>
      <div className="password-field"><input id={`${variant}-current-account-password`} type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /><button className="password-toggle" type="button" onClick={() => setShowCurrentPassword((visible) => !visible)} aria-label={showCurrentPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showCurrentPassword}>{showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <label htmlFor={`${variant}-account-new-password`}>{t("passwordRecovery.newPassword")}</label>
      <div className="password-field"><input id={`${variant}-account-new-password`} type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={minimumPasswordLength} required aria-describedby={`${variant}-account-password-requirements`} /><button className="password-toggle" type="button" onClick={() => setShowNewPassword((visible) => !visible)} aria-label={showNewPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showNewPassword}>{showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <small id={`${variant}-account-password-requirements`} className={`password-requirement${newPassword && !isStrongPassword(newPassword) ? " invalid" : ""}`}>{t("passwordRequirements")}</small>
      <label htmlFor={`${variant}-account-confirm-password`}>{t("passwordRecovery.confirmPassword")}</label>
      <div className="password-field"><input id={`${variant}-account-confirm-password`} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={minimumPasswordLength} required /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <button className="primary-button small password-change-submit" type="submit" disabled={status === "loading"}>{status === "loading" ? t("working") : t("userSettings.passwordChange.submit")} <ArrowUpRight size={16} /></button>
    </form>
    {message && <p className={`form-message ${status}`} role={status === "error" ? "alert" : "status"}>{status === "success" && <Check size={15} />}{message}</p>}
  </section>;
}
