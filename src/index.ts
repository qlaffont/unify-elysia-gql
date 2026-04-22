import type { createPinoLogger } from "@bogeychan/elysia-logger";
import { GraphQLError } from "graphql";
import {
  BadRequest,
  Conflict,
  CustomError,
  type ErrorResponse,
  Forbidden,
  InternalServerError,
  NotFound,
  NotImplemented,
  ServiceUnavailable,
  TimeOut,
  TooManyRequests,
  Unauthorized,
  isCustomError,
} from "unify-errors";

export interface PluginUnifyElysiaGraphQL {
  logInstance?: ReturnType<typeof createPinoLogger> | typeof console;
  disableDetails?: boolean;
  disableLog?: boolean;
}

const DEFAULT_ERROR_MESSAGE = "An unexpected error occured";

const resolveStatusCode = (error: CustomError): number => {
  if (error instanceof BadRequest) return 400;
  if (error instanceof Unauthorized) return 401;
  if (error instanceof Forbidden) return 403;
  if (error instanceof NotFound) return 404;
  if (error instanceof Conflict) return 409;
  if (error instanceof TimeOut) return 408;
  if (error instanceof TooManyRequests) return 429;
  if (error instanceof InternalServerError) return 500;
  if (error instanceof NotImplemented) return 501;
  if (error instanceof ServiceUnavailable) return 503;

  return 500;
};

const normalizeThrownError = (rawError: unknown): Error => {
  if (rawError instanceof Error) return rawError;
  if (typeof rawError === "string") return new Error(rawError);

  return new Error(DEFAULT_ERROR_MESSAGE);
};

const buildResponse = (
  values: Omit<ErrorResponse, "details"> & { details?: string[] },
  includeDetails: boolean,
): ErrorResponse => ({
  code: values.code,
  message: values.message,
  details: includeDetails ? (values.details ?? []) : [],
  localizedMessage: values.localizedMessage,
});

export const pluginUnifyElysiaGraphQL = (userConfig: PluginUnifyElysiaGraphQL = {}) => {
  const defaultConfig: Omit<Required<PluginUnifyElysiaGraphQL>, "logInstance"> = {
    disableDetails: false,
    disableLog: false,
  };

  const config: PluginUnifyElysiaGraphQL = {
    ...defaultConfig,
    ...userConfig,
  };

  const handleQueryAndResolver =
    <T>(resolver: (...args: unknown[]) => T | Promise<T>) =>
    async (...args: unknown[]): Promise<T> => {
      try {
        return await resolver(...args);
      } catch (rawError: unknown) {
        const error = normalizeThrownError(rawError);
        const includeDetails = !config.disableDetails;
        let statusCodeToSend = 500;
        let response: ErrorResponse;

        if (!config.disableLog && !!config.logInstance) {
          config.logInstance.error(error);
        }

        if (isCustomError(error)) {
          statusCodeToSend = resolveStatusCode(error);
          response = error.toResponse(includeDetails);
        } else if (error.message.toLowerCase() === "graphql validation error".toLowerCase()) {
          statusCodeToSend = 400;
          response = buildResponse(
            {
              code: "VALIDATION_ERROR",
              message: "Bad Request",
              details: [error.message],
            },
            includeDetails,
          );
        } else if (error.message.toLowerCase().includes("too many requests")) {
          statusCodeToSend = 429;
          response = buildResponse(
            {
              code: "TOO_MANY_REQUESTS",
              message: "Too Many Requests",
              details: [error.message],
            },
            includeDetails,
          );
        } else {
          response = buildResponse(
            {
              code: "INTERNAL_SERVER_ERROR",
              message: DEFAULT_ERROR_MESSAGE,
              details: [error.message],
            },
            includeDetails,
          );
        }

        throw new GraphQLError(
          response.message ?? response.localizedMessage ?? response.code ?? DEFAULT_ERROR_MESSAGE,
          {
            extensions: {
              http: {
                status: statusCodeToSend,
              },
              ...response,
            },
            originalError: error,
          },
        );
      }
    };

  const handleQueriesAndResolvers = <T>(queries: Array<(...args: unknown[]) => T | Promise<T>>) => {
    return queries.map((query) => handleQueryAndResolver(query));
  };

  return { handleQueryAndResolver, handleQueriesAndResolvers };
};
