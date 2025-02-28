import { Tool } from '@synaptic-ai/toolmaker';

// This is a single-capability tool
export const usaClock = new Tool({
  name: 'Get Time',
  description: 'Returns the current time in New York (ET)',
  runner: async () => {
    // Get current time in New York
    const now = new Date();
    
    let formattedTime;
    try {
      formattedTime = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    } catch (error) {
      // Fallback if timezone is invalid
      formattedTime = now.toLocaleString();
    }
    
    return {
      time: formattedTime,
      iso: now.toISOString(),
      timezone: 'America/New_York',
      unix: Math.floor(now.getTime() / 1000),
      region: 'Eastern Time'
    };
  }
});

export default usaClock; 