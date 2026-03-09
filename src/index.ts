import type { createPinoLogger } from '@bogeychan/elysia-logger';
import { GraphQLError } from 'graphql';
import {
  BadRequest,
  Forbidden,
  InternalServerError,
  NotFound,
  NotImplemented,
  TimeOut,
  TooManyRequests,
  Unauthorized,
} from 'unify-errors';

export interface PluginUnifyElysiaGraphQL {
  logInstance?: ReturnType<typeof createPinoLogger> | typeof console;
  disableDetails?: boolean;
  disableLog?: boolean;
}

export const pluginUnifyElysiaGraphQL = (
  userConfig: PluginUnifyElysiaGraphQL = {},
) => {
  const defaultConfig: Omit<
    Required<PluginUnifyElysiaGraphQL>,
    'logInstance'
  > = {
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
        // @ts-ignore
      } catch (error: CustomError | Error) {
        let statusCodeToSend = 200;

        if (!config.disableLog && !!config.logInstance) {
          config.logInstance.error(error);
        }

        if (error && 'context' in error) {
          let httpCode = 0;

          switch (error.name) {
            case BadRequest.name: {
              httpCode = 400;
              break;
            }
            case Unauthorized.name: {
              httpCode = 401;
              break;
            }
            case Forbidden.name: {
              httpCode = 403;
              break;
            }
            case NotFound.name: {
              httpCode = 404;
              break;
            }
            case TimeOut.name: {
              httpCode = 408;
              break;
            }
            case TooManyRequests.name: {
              httpCode = 429;
              break;
            }
            case InternalServerError.name: {
              httpCode = 500;
              break;
            }
            case NotImplemented.name: {
              httpCode = 501;
              break;
            }
            default: {
              httpCode = 500;
              break;
            }
          }

          statusCodeToSend =
            httpCode > statusCodeToSend ? httpCode : statusCodeToSend;
        } else {
          if (
            error.message.toLowerCase() ===
            'graphql validation error'.toLowerCase()
          ) {
            statusCodeToSend = 400;
          }

          if (error.message.toLowerCase().includes('too many requests')) {
            statusCodeToSend = 429;
          }

          statusCodeToSend = 500;
        }

        throw new GraphQLError(error.message, {
          extensions: {
            http: {
              status: statusCodeToSend,
            },
            context: error?.context || {},
            ...(config.disableDetails ? {} : { stack: error.stack }),
          },
          originalError: error,
        });
      }
    };

  const handleQueriesAndResolvers = <T>(
    queries: Array<(...args: unknown[]) => T | Promise<T>>,
  ) => {
    return queries.map((query) => handleQueryAndResolver(query));
  };

  return { handleQueryAndResolver, handleQueriesAndResolvers };
};
