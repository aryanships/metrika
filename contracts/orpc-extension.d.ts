import type { OpenAPIMeta } from "@orpc/openapi";
import type { ErrorMap, AnySchema } from "@orpc/contract";

declare module "@orpc/contract" {
  interface ContractBuilder<TErrorMap extends ErrorMap> {
    route(meta: OpenAPIMeta): ContractBuilder<TErrorMap>;
  }
  interface ProcedureContractBuilderWithInput<
    TInputSchema extends AnySchema,
    TErrorMap extends ErrorMap
  > {
    route(meta: OpenAPIMeta): ProcedureContractBuilderWithInput<TInputSchema, TErrorMap>;
  }
  interface ProcedureContractBuilderWithOutput<
    TOutputSchema extends AnySchema,
    TErrorMap extends ErrorMap
  > {
    route(meta: OpenAPIMeta): ProcedureContractBuilderWithOutput<TOutputSchema, TErrorMap>;
  }
  interface ProcedureContractBuilderWithInputOutput<
    TInputSchema extends AnySchema,
    TOutputSchema extends AnySchema,
    TErrorMap extends ErrorMap
  > {
    route(meta: OpenAPIMeta): ProcedureContractBuilderWithInputOutput<
      TInputSchema,
      TOutputSchema,
      TErrorMap
    >;
  }
}
