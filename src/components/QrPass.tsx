import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Maximize2, X } from "lucide-react";

type QrPassProps = {
  value: string;
  alt: string;
  expandable?: boolean;
  expandLabel?: string;
  closeLabel?: string;
  fullscreenTitle?: string;
  fullscreenCopy?: string;
};

type ScreenWakeLock = {
  release: () => Promise<void>;
};

export default function QrPass({ value, alt, expandable = false, expandLabel = "", closeLabel = "", fullscreenTitle = "", fullscreenCopy = "" }: QrPassProps) {
  const [source, setSource] = useState("");
  const [expanded, setExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(value, { width: 256, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0b0b0b", light: "#ffffff" } })
      .then((dataUrl) => {
        if (mounted) setSource(dataUrl);
      })
      .catch(() => {
        if (mounted) setSource("");
      });
    return () => { mounted = false; };
  }, [value]);

  useEffect(() => {
    if (!expanded) return;
    let wakeLock: ScreenWakeLock | null = null;
    const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<ScreenWakeLock> } }).wakeLock;
    if (wakeLockApi) void wakeLockApi.request("screen").then((lock) => { wakeLock = lock; }).catch(() => undefined);

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
      if (wakeLock) void wakeLock.release().catch(() => undefined);
    };
  }, [expanded]);

  if (!source) return <span className="qr-pass-placeholder" aria-live="polite" />;

  return (
    <div className="qr-pass-control">
      <img className="qr-pass-image" src={source} alt={alt} />
      {expandable && <button className="qr-expand-button" type="button" onClick={() => setExpanded(true)}><Maximize2 size={16} />{expandLabel}</button>}
      {expanded && <div className="qr-fullscreen" role="dialog" aria-modal="true" aria-label={fullscreenTitle}>
        <button ref={closeButtonRef} className="qr-fullscreen-close" type="button" onClick={() => setExpanded(false)} aria-label={closeLabel}><X size={23} /></button>
        <div className="qr-fullscreen-content">
          <span className="qr-fullscreen-brand">BAILA INNSBRUCK</span>
          <h2>{fullscreenTitle}</h2>
          <img className="qr-fullscreen-image" src={source} alt={alt} />
          <p>{fullscreenCopy}</p>
        </div>
      </div>}
    </div>
  );
}
