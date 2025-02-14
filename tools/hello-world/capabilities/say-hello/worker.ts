import { runner } from './runner'

export interface Env {
  // Define your environment variables here
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      // Parse request
      const url = new URL(request.url);
      const name = url.searchParams.get('name') || 'World';
      const language = (url.searchParams.get('language') || 'en') as 'en' | 'es' | 'fr';

      // Run the capability
      const result = await runner({ name, language });

      // Return response
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (error) {
      // Handle errors
      return new Response(JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },

  // Handle OPTIONS requests for CORS
  async options(request: Request): Promise<Response> {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  },
}; 