import { logger } from "@bogeychan/elysia-logger";
import { yoga } from "@elysiajs/graphql-yoga";
import { Elysia } from "elysia";
import {
  BadRequest,
  Conflict,
  CustomError,
  Forbidden,
  InternalServerError,
  NotFound,
  NotImplemented,
  ServiceUnavailable,
  TimeOut,
  TooManyRequests,
  Unauthorized,
} from "unify-errors";

import { PluginUnifyElysiaGraphQL, pluginUnifyElysiaGraphQL } from "../../src";

const errorMessages: Record<string, string> = {
  BadRequest: "Bad Request",
  Unauthorized: "Unauthorized",
  Forbidden: "Forbidden",
  NotFound: "Not Found",
  Conflict: "Conflict",
  TimeOut: "Request Time-out",
  InternalServerError: "Internal Server Error",
  NotImplemented: "Not Implemented",
  ServiceUnavailable: "Service Unavailable",
  TooManyRequests: "Too Many Requests",
};

export const app = (config?: PluginUnifyElysiaGraphQL) => {
  const { handleQueryAndResolver, handleQueriesAndResolvers } = pluginUnifyElysiaGraphQL(config);

  const [handleGraphqlValidationError, handleTooManyRequestsMessage] =
    handleQueriesAndResolvers<string>([
      () => {
        throw new Error("graphql validation error");
      },
      () => {
        throw new Error("too many requests");
      },
    ]);

  const server = new Elysia()
    .use(
      logger({
        level: "error",
        autoLogging: false,
      }),
    )
    .use(
      yoga({
        typeDefs: `
          type Query {
            BadRequest: String!
            Unauthorized: String!
            Forbidden: String!
            NotFound: String!
            Conflict: String!
            TimeOut: String!
            InternalServerError: String!
            NotImplemented: String!
            ServiceUnavailable: String!
            CustomError: String!
            Success: String!
            testOtherError: String!
            TooManyRequests: String!
            testGraphqlValidationError: String!
            testTooManyRequestsMessage: String!
          }
        `,
        resolvers: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          Query: {
            ...[
              BadRequest,
              Unauthorized,
              Forbidden,
              NotFound,
              Conflict,
              TimeOut,
              InternalServerError,
              NotImplemented,
              ServiceUnavailable,
              TooManyRequests,
            ].reduce(
              (prev, errorType) => ({
                ...prev,
                [errorType.name]: handleQueryAndResolver(() => {
                  throw new errorType(`${errorType.name.toUpperCase()}_CODE`, {
                    message: errorMessages[errorType.name],
                    details: ["This is the issue"],
                  });
                }),
              }),
              {},
            ),
            CustomError: handleQueryAndResolver(() => {
              throw new CustomError("CUSTOM_ERROR", {
                message: "Custom Error",
                details: ["This is the issue"],
              });
            }),
            Success: handleQueryAndResolver(() => {
              return "result";
            }),
            testOtherError: handleQueryAndResolver(() => {
              throw new Error("test");
            }),
            testGraphqlValidationError: handleGraphqlValidationError,
            testTooManyRequestsMessage: handleTooManyRequestsMessage,
          },
        },
      }),
    );

  return server;
};
