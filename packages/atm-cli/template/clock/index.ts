import { Tool } from '@synaptic-ai/toolmaker';
import { z } from 'zod';

const timeSchema = z.object({
  timezone: z.string().optional().describe("Optional timezone (defaults to local timezone)")
});

export const getTime = new Tool({
  name: 'Get Time',
  description: 'Returns the current date and time',
  schema: timeSchema,
  runner: async (params) => {
    // Get current time
    const now = new Date();
    
    let formattedTime;
    try {
      // Format with timezone if provided
      if (params.timezone) {
        formattedTime = now.toLocaleString('en-US', { timeZone: params.timezone });
      } else {
        formattedTime = now.toLocaleString();
      }
    } catch (error) {
      // Fallback if timezone is invalid
      formattedTime = now.toLocaleString();
    }
    
    return {
      time: formattedTime,
      iso: now.toISOString(),
      timezone: params.timezone || 'local',
      unix: Math.floor(now.getTime() / 1000)
    };
  }
});

export default getTime; 