"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { client } from "@/lib/orpc.client";
import type { AttachmentKind, AttachmentOutput, AttachmentTarget } from "@/modules/files/schema";
import { Button } from "@/components/ui/button";
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
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

type UploadStatus = "idle" | "uploading" | "error";

export function FileUpload({
  kind,
  target,
  accept,
  capture,
  label = "Upload file",
  onUploaded,
}: {
  kind: AttachmentKind;
  target: AttachmentTarget;
  accept?: string;
  capture?: "environment" | "user";
  label?: string;
  onUploaded: (attachment: AttachmentOutput) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const failedFileRef = useRef<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    failedFileRef.current = file;
    setStatus("uploading");
    setProgress(0);
    setFileName(file.name);
    setError(null);
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
      setStatus("idle");
      onUploaded(attachment);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const busy = status === "uploading";

  return (
    <div>
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
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors",
          dragOver ? "bg-muted" : "hover:bg-muted/50",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <UploadIcon className="size-4 text-muted-foreground" />
        <p className="text-xs font-medium">{busy ? "Uploading…" : label}</p>
        <p className="text-xs text-muted-foreground">
          {busy ? `${fileName} · ${progress}%` : "Click or drop a file"}
        </p>
      </div>

      {status === "error" ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2">
          <p className="truncate text-xs text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => failedFileRef.current && upload(failedFileRef.current)}
          >
            Retry
          </Button>
        </div>
      ) : null}

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
