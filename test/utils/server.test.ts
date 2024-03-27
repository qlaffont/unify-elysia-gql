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
  Unauthorized,
} from 'unify-errors';

import { PluginUnifyElysiaGraphQL, pluginUnifyElysiaGraphQL } from '../../src';

export const app = (config?: PluginUnifyElysiaGraphQL) => {
  const { handleQueryAndResolver } = pluginUnifyElysiaGraphQL(config);

  const server = new Elysia()
    .use(
      logger({
        level: 'error',
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
          },
        },
      }),
    );

  return server;
};
