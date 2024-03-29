import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as Docker from 'dockerode'
import { config as loadEnv } from 'dotenv'
import { bearerAuth } from 'hono/bearer-auth'
import {
  sessionExecRoute,
  sessionPostRoute,
  sessionStopRoute,
} from './route-schema'
import { handleDockerExecStream } from './lib/handle-docker-exec-stream'

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
        Image: imageName,
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

app.openapi(
  sessionStopRoute,
  // @ts-ignore
  async (c) => {
    const { containerId } = c.req.valid('param')
    const container = docker.getContainer(containerId)
    try {
      await container.stop()
      await container.remove()
      return c.json({ containerId: container.id })
    } catch (error) {
      console.error(error)
      // @ts-ignore
      return c.text(error.message, 400)
    }
  },
)

app.openapi(
  sessionExecRoute,
  // @ts-ignore
  async (c) => {
    const containerId = c.req.param('containerId')
    const command = await c.req.text()
    const container = docker.getContainer(containerId)
    try {
      const exec = await container.exec({
        Cmd: ['bash', '-c', command],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      })

      const stream = await exec.start({ stdin: true, hijack: true })
      const output = await handleDockerExecStream(stream)

      return c.text(output)
    } catch (error) {
      console.error(error)
      // @ts-ignore
      return c.text(error.message, 400)
    }
  },
)

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
