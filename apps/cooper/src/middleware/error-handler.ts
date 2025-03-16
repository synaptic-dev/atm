import { Context, Next } from 'hono';

export class AppError extends Error {
  status: number;
  
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof AppError) {
      return c.json({ 
        status: 'error', 
        message: error.message 
      }, error.status as any);
    }
    
    return c.json({ 
      status: 'error', 
      message: 'Internal Server Error' 
    }, 500 as any);
  }
}; 