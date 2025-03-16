import { Context, Next } from 'hono';
import { cors as honoCors } from 'hono/cors';

export const corsMiddleware = honoCors(); 