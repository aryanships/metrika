"use client";

import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  hasMore,
  onPage,
}: {
  page: number;
  totalPages: number;
  hasMore: boolean;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(totalPages, 1);
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
