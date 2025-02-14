export function generateWorkerCode(): string {
  return `import { runner } from './runner'

export default {
  async fetch(request) {
    try {
      // Parse URL parameters
      const url = new URL(request.url);
      const params = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Run the capability
      const result = await runner(params);

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
      return new Response(
        JSON.stringify({
          error: 'Failed to process request',
          details: error.message || 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },

  // Handle OPTIONS requests for CORS
  async options() {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  },
};`
} 