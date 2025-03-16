import { Hono } from 'hono'
import { Env } from '@/types/env'

const baseRouter = new Hono<{ Bindings: Env }>()

baseRouter.get('/', (c) => {
  return c.json({
    status: 'success',
    message: 'Cooper API is running'
  })
})

export default baseRouter 