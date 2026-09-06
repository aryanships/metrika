/** Extract a user-facing message from an oRPC/HTTP error, or a plain Error. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const data = (error as Error & { data?: { message?: string } }).data;
    if (data?.message) return data.message;
    return error.message;
  }
  return "Something went wrong";
}
