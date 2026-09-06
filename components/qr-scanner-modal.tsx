"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { CameraIcon, QrCodeIcon, SparklesIcon, UploadIcon, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DEMO_SEALS = [
  { code: "CERT-2026-0008", label: "Active seal", tone: "emerald" },
  { code: "CERT-2024-0001", label: "Expired seal", tone: "rose" },
] as const;

function cleanCertCode(raw: string): string {
  const text = raw.trim();
  const path = text.match(/\/verify\/c\/([^/?#]+)/i);
  if (path?.[1]) return decodeURIComponent(path[1]);
  const query = text.match(/[?&]id=([^&#]+)/i);
  if (query?.[1]) return decodeURIComponent(query[1]);
  return text;
}

export function QrScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const [tab, setTab] = useState<"camera" | "upload">("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [scanningFile, setScanningFile] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const finish = useCallback(
    (raw: string) => {
      const code = cleanCertCode(raw);
      if (code) onScan(code);
    },
    [onScan],
  );

  useEffect(() => {
    if (!open || tab !== "camera") return;

    let cancelled = false;
    let instance: Html5Qrcode | null = null;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      instance = new Html5Qrcode("qr-camera-box");
      scannerRef.current = instance;
      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            void instance?.stop().catch(() => {});
            finish(decodedText);
          },
          () => {},
        );
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError("Could not start the camera. Try uploading a photo instead.");
      }
    })();

    return () => {
      cancelled = true;
      const inst = instance ?? scannerRef.current;
      if (inst) {
        if (inst.isScanning) void inst.stop().catch(() => {});
        inst.clear();
      }
      scannerRef.current = null;
    };
  }, [open, tab, finish]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setScanningFile(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-file-box");
      try {
        const text = await scanner.scanFile(file, true);
        finish(text);
      } finally {
        scanner.clear();
      }
    } catch {
      setFileError("Could not detect a QR code in that image. Try another photo.");
    } finally {
      setScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm overflow-hidden rounded-2xl border">
        <CardHeader className="flex flex-row items-center justify-between border-b p-3.5">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <QrCodeIcon className="size-4 text-primary" /> Scan certificate QR
          </CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </CardHeader>

        <div className="flex border-b bg-muted/30 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab("camera");
              setCameraError(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 font-medium transition",
              tab === "camera"
                ? "border-primary bg-background text-primary"
                : "border-transparent text-muted-foreground",
            )}
          >
            <CameraIcon className="size-3.5" /> Live camera
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("upload");
              setFileError(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 font-medium transition",
              tab === "upload"
                ? "border-primary bg-background text-primary"
                : "border-transparent text-muted-foreground",
            )}
          >
            <UploadIcon className="size-3.5" /> Upload photo
          </button>
        </div>

        <CardContent className="space-y-4 p-4">
          {tab === "camera" ? (
            <div className="space-y-2">
              <div id="qr-camera-box" className="aspect-square w-full overflow-hidden rounded-xl border bg-black" />
              {cameraError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  {cameraError}
                </p>
              ) : (
                <p className="text-center text-[11px] text-muted-foreground">
                  Point the camera at the QR code on the certificate.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition hover:bg-muted/40"
              >
                <UploadIcon className="size-8 text-primary" />
                <div>
                  <p className="text-xs font-semibold">Choose a QR screenshot or photo</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, or WebP</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              {scanningFile ? (
                <p className="text-[11px] text-muted-foreground">Scanning image…</p>
              ) : null}
              {fileError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  {fileError}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5 border-t pt-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <SparklesIcon className="size-3 text-primary" /> 1-click demo seals
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_SEALS.map((seal) => (
                <button
                  key={seal.code}
                  type="button"
                  onClick={() => finish(seal.code)}
                  className={cn(
                    "truncate rounded-lg border p-1.5 text-left font-mono text-[10px] transition",
                    seal.tone === "emerald"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20",
                  )}
                >
                  {seal.code} ({seal.label})
                </button>
              ))}
            </div>
          </div>

          <div id="qr-file-box" className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
}
