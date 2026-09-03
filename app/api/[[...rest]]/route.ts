import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { CORSPlugin } from "@orpc/server/plugins";
import { onError } from "@orpc/server";
import { router } from "@/app/router";
import { createInitialContext } from "@/middleware/context";

const zodConverter = new ZodToJsonSchemaConverter();

const generator = new OpenAPIGenerator({
    converters: [zodConverter],
});

const handler = new OpenAPIHandler(router, {
    plugins: [
        new CORSPlugin(),
        new SmartCoercionHandlerPlugin({ converters: [zodConverter] }),
        new OpenAPIReferenceHandlerPlugin({
            spec: () =>
                generator.generate(router, {
                    base: {
                        info: {
                            title: "Tutorial API",
                            version: "1.0.0",
                            description:
                                "Production-grade Tutorial API built with ORPC and Next.js",
                        },
                        servers: [{ url: "/api" }],
                        security: [{ bearerAuth: [] }],
                        components: {
                            securitySchemes: {
                                bearerAuth: {
                                    type: "http",
                                    scheme: "bearer",
                                },
                            },
                        },
                    },
                }),
        }),
    ],
    interceptors: [
        onError((error) => {
            console.error(error);
        }),
    ],
});

async function handleRequest(request: Request) {
    const resHeaders = new Headers();
    const context = await createInitialContext(request.headers, resHeaders);

    const { matched, response } = await handler.handle(request, {
        prefix: "/api",
        context,
    });

    if (!matched) {
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
