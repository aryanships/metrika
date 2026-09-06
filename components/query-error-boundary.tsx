"use client";

import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { ErrorState } from "@/components/error-state";

function QueryErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : undefined;
  return <ErrorState description={message} onRetry={resetErrorBoundary} />;
}

/**
 * Consistent error boundary for suspense-based sections. A suspended query
 * that throws surfaces here with a retry button; wrap the suspense content
 * in this component so every section shares the same error UX.
 */
export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={QueryErrorFallback}>{children}</ErrorBoundary>;
}
