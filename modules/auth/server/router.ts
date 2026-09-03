import { implement } from "@orpc/server";
import { deleteCookie, setCookie } from "@orpc/server/helpers";
import { authContract } from "../contract";
import { authService } from "./service";
import { auditService } from "@/modules/audit/server/service";
import { requireAuth } from "@/middleware/require-auth";
import { AppContext, SESSION_COOKIE } from "@/middleware/context";

const implementer = implement(authContract).$context<AppContext>();

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

function setSessionCookie(resHeaders: Headers, token: string) {
  setCookie(resHeaders, SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

async function auditAuthEvent(
  context: AppContext,
  actor: { id: string; roles: string[] },
  action: string,
) {
  await auditService.recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.roles.join(",") || null,
    action,
    entityType: "User",
    entityId: actor.id,
    ipAddress: context.clientIp,
    requestId: context.requestId,
  });
}

export const authRouter = implementer.router({
  registerOwner: implementer.registerOwner.handler(async ({ input, context }) => {
    const result = await authService.registerOwner(input);
    setSessionCookie(context.resHeaders, result.sessionToken);
    await auditAuthEvent(context, result.user, "AUTH_REGISTER");
    return { user: result.user };
  }),

  login: implementer.login.handler(async ({ input, context }) => {
    const result = await authService.login(input);
    setSessionCookie(context.resHeaders, result.sessionToken);
    await auditAuthEvent(context, result.user, "AUTH_LOGIN");
    return { user: result.user };
  }),

  logout: implementer.logout.handler(async ({ context }) => {
    await authService.logout(context.sessionToken);
    deleteCookie(context.resHeaders, SESSION_COOKIE, { path: "/" });
    if (context.user) {
      await auditAuthEvent(context, context.user, "AUTH_LOGOUT");
    }
    return { success: true };
  }),

  me: implementer.me.use(requireAuth).handler(async ({ context }) => {
    return context.user!;
  }),

  acceptInvitation: implementer.acceptInvitation.handler(async ({ input, context }) => {
    const result = await authService.acceptInvitation(input);
    setSessionCookie(context.resHeaders, result.sessionToken);
    await auditAuthEvent(context, result.user, "AUTH_ACCEPT_INVITATION");
    return { user: result.user };
  }),
});
