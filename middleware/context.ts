export interface AppUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  businessId?: string | null;
  stateId?: string | null;
  districtId?: string | null;
  gatcId?: string | null;
}

export interface AppContext {
  headers: Headers;
  user?: AppUser | null;
  sessionId?: string | null;
  requestId?: string;
}

export function createInitialContext(headers: Headers): AppContext {
  return {
    headers,
    user: null,
    sessionId: null,
    requestId: headers.get("x-request-id") ?? crypto.randomUUID(),
  };
}
