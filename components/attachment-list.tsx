"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, EyeIcon, FileIcon, FileTextIcon, ImageIcon } from "lucide-react";
import { orpc } from "@/lib/orpc-query";
import { client } from "@/lib/orpc.client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { AttachmentOutput, AttachmentTarget } from "@/modules/files/schema";

const PHOTO_KINDS = new Set([
  "INSTRUMENT_FRONT",
  "SERIAL_NUMBER",
  "NAMEPLATE",
  "CONDITION",
  "VERIFICATION_AREA",
  "TEST_SETUP",
]);

export function kindLabel(kind: string): string {
  return kind.toLowerCase().replaceAll("_", " ");
}

export function isPhotoKind(kind: string): boolean {
  return PHOTO_KINDS.has(kind);
}

function PhotoCard({ attachment }: { attachment: AttachmentOutput }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    client.files
      .getDownloadUrl({ fileId: attachment.fileId })
      .then(({ downloadUrl }) => setUrl(downloadUrl))
      .catch(() => {});
  }, [attachment.fileId]);

  function openFull() {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:border-primary/50">
      <div className="relative h-44 w-full overflow-hidden bg-muted/40 cursor-pointer" onClick={openFull}>
        {url ? (
          <img
            src={url}
            alt={attachment.fileName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8 opacity-40 animate-pulse" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs bg-background/80 backdrop-blur-xs">
            <EyeIcon className="size-3" />
            View
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="outline" className="text-[10px] capitalize">
            {kindLabel(attachment.kind)}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{formatDate(attachment.createdAt)}</span>
        </div>
        <p className="truncate text-xs font-medium text-foreground">{attachment.fileName}</p>
      </div>
    </div>
  );
}

function DocumentRow({ attachment }: { attachment: AttachmentOutput }) {
  async function download() {
    const { downloadUrl } = await client.files.getDownloadUrl({ fileId: attachment.fileId });
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:border-primary/40">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileTextIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{attachment.fileName}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {kindLabel(attachment.kind)} · {formatDate(attachment.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={download} className="h-8 gap-1.5 text-xs">
          <DownloadIcon className="size-3" />
          Download
        </Button>
      </div>
    </div>
  );
}

export function AttachmentList({
  target,
  photosOnly = false,
  documentsOnly = false,
  excludeKinds = [],
  emptyTitle = "No files uploaded",
}: {
  target: AttachmentTarget;
  photosOnly?: boolean;
  documentsOnly?: boolean;
  excludeKinds?: string[];
  emptyTitle?: string | null;
}) {
  const query = useQuery(orpc.files.listAttachments.queryOptions({ input: target }));

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading files…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load files.</p>;

  const excludeSet = new Set(excludeKinds);
  const attachments = (query.data ?? []).filter((a) => {
    if (excludeSet.has(a.kind)) return false;
    if (photosOnly) return isPhotoKind(a.kind);
    if (documentsOnly) return !isPhotoKind(a.kind);
    return true;
  });

  if (attachments.length === 0) {
    if (!emptyTitle) return null;
    return <EmptyState title={emptyTitle} />;
  }

  if (photosOnly) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attachments.map((attachment) => (
          <PhotoCard key={attachment.id} attachment={attachment} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <DocumentRow key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}
