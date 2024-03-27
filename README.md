# unify-elysia-gql

Library to have GraphQL generic errors from [unify-error](https://github.com/qlaffont/unify-errors) library.

Support :

- [GraphQL Yoga Plugin](https://elysiajs.com/plugins/graphql-yoga.html)
- [GraphQL Apollo Plugin](https://elysiajs.com/plugins/graphql-apollo.html)

## Usage

```typescript
import { pluginUnifyElysiaGraphQL } from 'unify-elysia-gql';
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
            throw new BadRequest({
              issue: 'This is the issue',
            });
          }),
        },
      },
    }),
  );

```

## Return

| name                      | description                                    |
| ------------------------- | ---------------------------------------------- |
| handleQueryAndResolver    | Map query and/or resolver callback             |
| handleQueriesAndResolvers | Map array of queries and/or resolvers callback |

## Plugin options

| name           | default   | description                                                     |
| -------------- | --------- | --------------------------------------------------------------- |
| logInstance    | undefined | (OPTIONAL) Pino or Console or @bogeychan/elysia-logger instance |
| disableDetails | false     | Disable error details like stack                                |
| disableLog     | false     | Disable logging on error                                        |

## Tests

To execute jest tests (all errors, type integrity test)

```
bun test
```
