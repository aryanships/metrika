import "server-only";
import { cache } from "react";
import { makeQueryClient } from "./query-client";

/** Stable query client for the lifetime of one request. */
export const getQueryClient = cache(makeQueryClient);
