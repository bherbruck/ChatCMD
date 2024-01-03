import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { zValidator as zodValidator } from '@hono/zod-validator'
import { validator } from 'hono/validator'
import { bearerAuth } from 'hono/bearer-auth'
import * as Docker from 'dockerode'
import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const PORT = Number(process.env.PORT ?? 3000)
const API_TOKEN = process.env.API_TOKEN
const DEFAULT_IMAGE = process.env.DEFAULT_IMAGE ?? 'debian'

const app = new Hono()
const docker = new Docker({ socketPath: '/var/run/docker.sock' })

if (API_TOKEN)
  app.use(
    '/api/*',
    bearerAuth({
      token: API_TOKEN,
    }),
  )
else console.warn('API_TOKEN not set, API is unprotected')

const sessionPostSchema = z.object({
  image: z.string().optional(),
})

app.post(
  '/api/sessions',
  zodValidator('json', sessionPostSchema),
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

app.post('/api/sessions/:containerId/stop', async (c) => {
  const containerId = c.req.param('containerId')
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

// app.post('/api/sessions/:containerId/exec', async (c) => {
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
      

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server listening at http://localhost:${info.port}`)
  },
)
