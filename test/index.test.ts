/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { beforeAll, describe, expect, it } from 'bun:test';
import Elysia from 'elysia';
import * as UnifyErrors from 'unify-errors';

import { app } from './utils/server.test';

const testGraphQL = async (
  server: Elysia,
  query: string,
  supposedMessage: { data: any; errors?: any[] },
  supposedStatus: number,
): Promise<{ data: any; errors?: any[] }> => {
  let status: number;
  let content: unknown;

  const body = JSON.stringify({ extensions: {}, query });

  await server
    .handle(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length.toString(),
        },
        body,
      }),
    )
    .then(async (res) => {
      status = res.status;

      try {
        content = await res.json();
        return;
        // eslint-disable-next-line no-empty
      } catch (error) {}

      return;
    });

  //@ts-ignore
  expect(content).toMatchObject(supposedMessage);
  expect(status!).toBe(supposedStatus);

  //@ts-ignore
  return content;
};

describe('Unify Elysia GQL', () => {
  let currentApp: Elysia;

  beforeAll(() => {
    //@ts-ignore
    currentApp = app();
  });

  it('should render error with a good format', async () => {
    const errors = [
      'BadRequest',
      'Unauthorized',
      'Forbidden',
      'NotFound',
      'TimeOut',
      'InternalServerError',
      'NotImplemented',
      'CustomError',
      'TooManyRequests',
    ];
    const errorsStatusCode = [400, 401, 403, 404, 408, 500, 501, 500, 429];

    for (const [errorIndex, errorType] of errors.entries()) {
      await testGraphQL(
        currentApp,
        `query {
            ${errorType}
          }
        `,
        {
          data: null,
          errors: [
            {
              message:
                new UnifyErrors[errorType as 'BadRequest']().message ||
                'Custom Error',
              extensions: {
                context: {
                  issue: 'This is the issue',
                },
              },
            },
          ],
        },
        errorsStatusCode[errorIndex],
      );
    }
  });

  it('should render not unifyerror', async () => {
    await testGraphQL(
      currentApp,
      `query {
            testOtherError
          }
        `,
      {
        data: null,
        errors: [
          {
            message: 'test',
          },
        ],
      },
      500,
    );
  });

  it('should render result', async () => {
    await testGraphQL(
      currentApp,
      ` query {
          Success
        }
        `,
      {
        data: {
          Success: 'result',
        },
      },
      200,
    );
  });

  it('should be able to render result and error', async () => {
    await testGraphQL(
      currentApp,
      ` query {
          Success
        }
        `,
      {
        data: {
          Success: 'result',
        },
      },
      200,
    );
  });

  it('should hide extensions if option enable', async () => {
    //@ts-ignore
    const customApp: Elysia = app({ disableDetails: true });

    const res = await testGraphQL(
      customApp,
      ` query {
          BadRequest
        }
        `,
      {
        data: null,
        errors: [
          {
            message: 'Bad Request',
          },
        ],
      },
      400,
    );
    expect(res.errors![0].extensions).toStrictEqual({
      context: {
        issue: 'This is the issue',
      },
    });
  });
});
