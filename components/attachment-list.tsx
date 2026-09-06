"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon } from "lucide-react";
import { orpc } from "@/lib/orpc-query";
import { client } from "@/lib/orpc.client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
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

function AttachmentRow({ attachment }: { attachment: AttachmentOutput }) {
  async function download() {
    const { downloadUrl } = await client.files.getDownloadUrl({ fileId: attachment.fileId });
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{attachment.fileName}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {kindLabel(attachment.kind)} · {formatDate(attachment.createdAt)}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={download}>
        View
      </Button>
    </div>
  );
}

export function AttachmentList({
  target,
  photosOnly = false,
  emptyTitle = "No files uploaded",
}: {
  target: AttachmentTarget;
  photosOnly?: boolean;
  emptyTitle?: string;
}) {
  const query = useQuery(orpc.files.listAttachments.queryOptions({ input: target }));

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading files…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load files.</p>;

  const attachments = (query.data ?? []).filter((a) => (photosOnly ? isPhotoKind(a.kind) : !isPhotoKind(a.kind)));

  if (attachments.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <AttachmentRow key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}
