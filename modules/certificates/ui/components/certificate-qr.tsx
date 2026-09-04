"use client";

import { QRCodeSVG } from "qrcode.react";

export function CertificateQr({ code, size = 176 }: { code: string; size?: number }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/verify/c/${encodeURIComponent(code)}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-md border border-border bg-white p-3">
        <QRCodeSVG value={url} size={size} level="M" />
      </div>
      <p className="text-xs text-muted-foreground">Scan to verify</p>
    </div>
  );
}
