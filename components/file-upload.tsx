"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
} from "lucide-react";
import { client } from "@/lib/orpc.client";
import type { AttachmentKind, AttachmentOutput, AttachmentTarget } from "@/modules/files/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function putFile(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Please check network connection."));
    xhr.send(file);
  });
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function isImage(fileName?: string, contentType?: string): boolean {
  if (contentType?.startsWith("image/")) return true;
  if (!fileName) return false;
  return /\.(jpe?g|png|webp|gif|svg)$/i.test(fileName);
}

function isVideo(fileName?: string, contentType?: string): boolean {
  if (contentType?.startsWith("video/")) return true;
  if (!fileName) return false;
  return /\.(mp4|webm|mov|avi)$/i.test(fileName);
}

type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

export interface FileUploadProps {
  kind: AttachmentKind;
  target: AttachmentTarget;
  accept?: string;
  capture?: "environment" | "user";
  label?: string;
  description?: string;
  value?: AttachmentOutput | null;
  onUploaded: (attachment: AttachmentOutput) => void;
  onRemoved?: () => void;
  className?: string;
}

export function FileUpload({
  kind,
  target,
  accept,
  capture,
  label = "Upload file",
  description,
  value,
  onUploaded,
  onRemoved,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const failedFileRef = useRef<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>(value ? "uploaded" : "idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState(value?.fileName ?? "");
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAttachment, setCurrentAttachment] = useState<AttachmentOutput | null>(value ?? null);
  const [error, setError] = useState<string | null>(null);

  // Synchronize when value changes from parent
  useEffect(() => {
    if (value) {
      setCurrentAttachment(value);
      setFileName(value.fileName);
      setStatus("uploaded");
      if (isImage(value.fileName)) {
        // Fetch download URL for image preview if no local preview exists
        client.files
          .getDownloadUrl({ fileId: value.fileId })
          .then(({ downloadUrl }) => setPreviewUrl(downloadUrl))
          .catch(() => {
            /* ignore preview fetch error */
          });
      }
    } else if (!currentAttachment) {
      setStatus("idle");
      setFileName("");
      setPreviewUrl(null);
    }
  }, [value]);

  async function upload(file: File) {
    failedFileRef.current = file;
    setStatus("uploading");
    setProgress(0);
    setFileName(file.name);
    setFileSize(file.size);
    setError(null);

    // Create immediate local object URL for snappy image preview
    if (isImage(file.name, file.type)) {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
    } else {
      setPreviewUrl(null);
    }

    try {
      const intent = await client.files.createUploadIntent({
        kind,
        target,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      await putFile(intent.uploadUrl, file, setProgress);

      const attachment = await client.files.confirmUpload({ uploadToken: intent.uploadToken });
      setCurrentAttachment(attachment);
      setStatus("uploaded");
      onUploaded(attachment);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCurrentAttachment(null);
    setFileName("");
    setFileSize(undefined);
    setStatus("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemoved?.();
  }

  function handleReplace(e: React.MouseEvent) {
    e.stopPropagation();
    inputRef.current?.click();
  }

  async function handleView(e: React.MouseEvent) {
    e.stopPropagation();
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (currentAttachment) {
      try {
        const { downloadUrl } = await client.files.getDownloadUrl({ fileId: currentAttachment.fileId });
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } catch {
        /* ignore */
      }
    }
  }

  const isImg = isImage(fileName);
  const isVid = isVideo(fileName);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* 1. UPLOADED STATE: Displays photo thumbnail or document badge */}
      {status === "uploaded" ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:border-primary/40">
          {isImg && previewUrl ? (
            <div className="relative h-40 w-full overflow-hidden bg-muted/40 group">
              <img
                src={previewUrl}
                alt={fileName}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90 transition-opacity" />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur-xs text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-3" />
                  Uploaded
                </Badge>
              </div>
              <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-white">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate leading-tight drop-shadow-xs">{label}</p>
                  <p className="text-[11px] text-white/80 truncate drop-shadow-xs">
                    {fileName} {fileSize ? `· ${formatBytes(fileSize)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleView}
                    title="View full size"
                    className="flex size-7 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition"
                  >
                    <EyeIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleReplace}
                    title="Replace file"
                    className="flex size-7 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition"
                  >
                    <RefreshCwIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    title="Remove file"
                    className="flex size-7 items-center justify-center rounded-md bg-destructive/80 text-white hover:bg-destructive backdrop-blur-xs transition"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {isVid ? <VideoIcon className="size-5" /> : <FileTextIcon className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold truncate">{label}</p>
                    <Badge variant="secondary" className="gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2Icon className="size-2.5" />
                      Uploaded
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {fileName} {fileSize ? `(${formatBytes(fileSize)})` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" type="button" onClick={handleView} className="size-8 p-0" title="View / download">
                  <EyeIcon className="size-3.5" />
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={handleReplace} className="size-8 p-0" title="Replace file">
                  <RefreshCwIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleRemove}
                  className="size-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Remove file"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. IDLE & UPLOADING STATES: Dropzone */
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          className={cn(
            "group relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/50 px-4 py-6 text-center transition-all",
            dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "hover:border-primary/50 hover:bg-muted/30",
            status === "uploading" && "pointer-events-none opacity-85",
            error && "border-destructive/50 bg-destructive/5",
          )}
        >
          {status === "uploading" ? (
            <div className="flex flex-col items-center gap-2.5 w-full max-w-[220px]">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-1 w-full">
                <p className="text-xs font-medium truncate max-w-[200px]">{fileName}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${Math.max(progress, 5)}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">{progress}% uploaded</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                {accept?.includes("image") ? (
                  <ImageIcon className="size-5" />
                ) : accept?.includes("video") ? (
                  <VideoIcon className="size-5" />
                ) : (
                  <UploadIcon className="size-5" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {description ?? "Click to browse or drop file here"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                <span>{accept?.includes("image") ? "PNG, JPG, WEBP" : "PDF, Images"} up to 10MB</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. ERROR BANNER */}
      {status === "error" && error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="truncate">{error}</p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="h-7 text-xs"
            onClick={() => failedFileRef.current && upload(failedFileRef.current)}
          >
            Retry
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
