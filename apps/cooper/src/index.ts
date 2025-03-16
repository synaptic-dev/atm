import { Hono } from 'hono'
import { Env } from '@/types/env'
import { corsMiddleware, errorHandler } from '@/middleware'
import { baseRouter, filesRouter, uploadRouter } from '@/routes'

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', corsMiddleware)
app.use('*', errorHandler)

// Mount routers
app.route('/', baseRouter)
app.route('/files', filesRouter)
app.route('/upload', uploadRouter)

export default app
