import { createRoute, z } from '@hono/zod-openapi'

const errorResponse = {
  description: 'Error',
  content: {
    'text/plain': {
      schema: z.string(),
    },
  },
}

export const sessionPostRoute = createRoute({
  path: '/api/session',
  method: 'post',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z
            .object({
              image: z
                .string()
                .optional()
                .openapi({ description: 'Image name' }),
            })
            .openapi('Session'),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session created',
      content: {
        'application/json': {
          schema: z.object({
            containerId: z.string(),
          }),
        },
      },
    },
    400: errorResponse,
  },
})

export const sessionStopRoute = createRoute({
  path: '/api/session/:containerId/stop',
  method: 'post',
  request: {
    params: z.object({
      containerId: z.string().openapi({ description: 'Container ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Session stopped',
      content: {
        'application/json': {
          schema: z.object({
            containerId: z.string(),
          }),
        },
      },
    },
    400: errorResponse,
  },
})
