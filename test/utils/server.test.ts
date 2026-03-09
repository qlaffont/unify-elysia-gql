import { logger } from '@bogeychan/elysia-logger';
import { yoga } from '@elysiajs/graphql-yoga';
import { Elysia } from 'elysia';
import {
  BadRequest,
  CustomError,
  Forbidden,
  InternalServerError,
  NotFound,
  NotImplemented,
  TimeOut,
  TooManyRequests,
  Unauthorized,
} from 'unify-errors';

import { PluginUnifyElysiaGraphQL, pluginUnifyElysiaGraphQL } from '../../src';

export const app = (config?: PluginUnifyElysiaGraphQL) => {
  const { handleQueryAndResolver, handleQueriesAndResolvers } =
    pluginUnifyElysiaGraphQL(config);

  const [handleGraphqlValidationError, handleTooManyRequestsMessage] =
    handleQueriesAndResolvers([
      () => {
        throw new Error('graphql validation error');
      },
      () => {
        throw new Error('too many requests');
      },
    ] as []);

  const server = new Elysia()
    .use(
      logger({
        level: 'error',
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
            TimeOut: String!
            InternalServerError: String!
            NotImplemented: String!
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
              TimeOut,
              InternalServerError,
              NotImplemented,
              TooManyRequests,
            ].reduce(
              (prev, errorType) => ({
                ...prev,
                [errorType.name]: handleQueryAndResolver(() => {
                  throw new errorType({
                    issue: 'This is the issue',
                  });
                }),
              }),
              {},
            ),
            CustomError: handleQueryAndResolver(() => {
              throw new CustomError('Custom Error', {
                issue: 'This is the issue',
              });
            }),
            Success: handleQueryAndResolver(() => {
              return 'result';
            }),
            testOtherError: handleQueryAndResolver(() => {
              throw new Error('test');
            }),
            testGraphqlValidationError: handleGraphqlValidationError,
            testTooManyRequestsMessage: handleTooManyRequestsMessage,
          },
        },
      }),
    );

  return server;
};
