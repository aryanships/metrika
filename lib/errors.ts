/** Extract a user-facing message from an oRPC/HTTP error, or a plain Error. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const data = (error as Error & {
      data?: { message?: string; issues?: { message?: string }[]; reason?: string };
    }).data;
    if (data?.message) return data.message;
    if (Array.isArray(data?.issues) && data.issues.length > 0) {
      return data.issues.map((i) => i.message).filter(Boolean).join(" · ");
    }
    return error.message;
  }
  return "Something went wrong";
}
