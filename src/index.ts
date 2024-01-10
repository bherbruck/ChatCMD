import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as Docker from 'dockerode'
import { config as loadEnv } from 'dotenv'
import { bearerAuth } from 'hono/bearer-auth'
import { sessionPostRoute, sessionStopRoute } from './route-schema'

loadEnv()

const PORT = Number(process.env.PORT ?? 3000)
const API_TOKEN = process.env.API_TOKEN
const DEFAULT_IMAGE = process.env.DEFAULT_IMAGE ?? 'debian'

const app = new OpenAPIHono()
const docker = new Docker({ socketPath: '/var/run/docker.sock' })

if (API_TOKEN)
  app.use(
    '/api/*',
    bearerAuth({
      token: API_TOKEN,
    }),
  )
else console.warn('API_TOKEN not set, API is unprotected')

app.openapi(
  sessionPostRoute,
  // @ts-ignore
  async (c) => {
    const { image } = c.req.valid('json')
    const imageName = image ?? DEFAULT_IMAGE
    try {
      await docker.pull(imageName)
      const container = await docker.createContainer({
        Image: image ?? 'debian',
        Cmd: ['/bin/sleep', 'infinity'],
      })
      await container.start()
      return c.json({ containerId: container.id })
    } catch (error) {
      console.error(error)
      // @ts-ignore
      return c.text(error.message, 400)
    }
  },
)

app.openapi(sessionStopRoute, async (c) => {
  const { containerId } = c.req.valid('param')
  const container = docker.getContainer(containerId)
  try {
    await container.stop()
    await container.remove()
    return c.text('OK')
  } catch (error) {
    console.error(error)
    // @ts-ignore
    return c.text(error.message, 400)
  }
})

// app.post('/api/session/:containerId/exec', async (c) => {
//   const containerId = c.req.param('containerId')
//   const container = docker.getContainer(containerId)
//   try {
//     const exec = await container.exec({
//       Cmd: ['bash'],
//       AttachStdin: true,
//       AttachStdout: true,
//       AttachStderr: true,
//       Tty: true,
//     })
//     const stream = await exec.start({
//       stdin: true,
//       hijack: true,
//       // @ts-ignore

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Docker API',
    version: '1.0.0',
  },
})

app.get('/ui', swaggerUI({ url: '/doc' }))

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server listening at http://localhost:${info.port}`)
  },
)
