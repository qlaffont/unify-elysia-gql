# unify-elysia-gql

GraphQL adapter for [`unify-errors`](https://github.com/qlaffont/unify-errors).
It wraps resolvers, maps shared error classes to HTTP status codes, and exposes
the unified payload in `GraphQLError.extensions`.

## Supported integrations

- [GraphQL Yoga Plugin](https://elysiajs.com/plugins/graphql-yoga.html)
- [GraphQL Apollo Plugin](https://elysiajs.com/plugins/graphql-apollo.html)

## Usage

```typescript
import Elysia from 'elysia';
import { yoga } from '@elysiajs/graphql-yoga';
import { pluginUnifyElysiaGraphQL } from 'unify-elysia-gql';
import { BadRequest } from 'unify-errors';

const { handleQueryAndResolver } = pluginUnifyElysiaGraphQL(config);

const server = new Elysia()
  .use(
    yoga({
      typeDefs: `
        type Query {
          BadRequest: String!
        }
      `,
      resolvers: {
        Query: {
          BadRequest: handleQueryAndResolver(() => {
            throw new BadRequest('BAD_REQUEST', {
              message: 'Bad Request',
              details: ['This is the issue'],
            });
          }),
        },
      },
    }),
  );

```

## Return values

| name | description |
| --- | --- |
| `handleQueryAndResolver` | Wrap a single resolver |
| `handleQueriesAndResolvers` | Wrap an array of resolvers |

## Plugin options

| name | default | description |
| --- | --- | --- |
| `logInstance` | `undefined` | Optional Pino, Console, or `@bogeychan/elysia-logger` instance |
| `disableDetails` | `false` | Strip `details` from serialized error payloads |
| `disableLog` | `false` | Disable logging on handled errors |

## Error shape

Handled errors are rethrown as `GraphQLError` instances with the shared payload
embedded in `extensions`:

```typescript
{
  http: {
    status: 400,
  },
  code?: string,
  message?: string,
  details: string[],
  localizedMessage?: string,
}
```

The adapter maps `unify-errors` classes to the same statuses as the HTTP
adapter and also normalizes non-custom validation and rate-limit failures.

When `disableDetails` is enabled, the payload keeps `code` and `message` but
returns an empty `details` array.

## Tests

```bash
bun test
```
