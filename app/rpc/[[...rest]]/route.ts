import { router } from "@/app/router";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createInitialContext } from "@/middleware/context";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

async function handleRequest(request: Request) {
  const resHeaders = new Headers();
  const context = await createInitialContext(request.headers, resHeaders);

  const { response } = await handler.handle(request, {
    prefix: "/rpc",
    context,
  });

  if (!response) {
    return new Response("Not found", { status: 404 });
  }

  for (const [key, value] of resHeaders.entries()) {
    response.headers.append(key, value);
  }

  return response;
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
