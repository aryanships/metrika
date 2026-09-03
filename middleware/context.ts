import { authService } from "@/modules/auth/server/service";
import type { UserRole } from "@/modules/auth/schema";

export const SESSION_COOKIE = "metrika_session";

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  phone: string | null;
  businessId: string | null;
  isActive: boolean;
}

export interface HeaderReader {
  get(name: string): string | null;
}

export interface AppContext {
  headers: HeaderReader;
  resHeaders: Headers;
  user: AppUser | null;
  sessionToken: string | null;
  requestId: string;
  clientIp: string | null;
}

export function getClientIp(headers: HeaderReader): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || null;
  return headers.get("x-real-ip");
}

function readCookie(headers: HeaderReader, name: string): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export async function createInitialContext(
  headers: HeaderReader,
  resHeaders: Headers = new Headers(),
): Promise<AppContext> {
  const token = readCookie(headers, SESSION_COOKIE);
  const user = token ? await authService.resolveSession(token) : null;

  return {
    headers,
    resHeaders,
    user,
    sessionToken: token ?? null,
    requestId: headers.get("x-request-id") ?? crypto.randomUUID(),
    clientIp: getClientIp(headers),
  };
}
