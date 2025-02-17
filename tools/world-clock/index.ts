import { z } from 'zod';
import { Tool } from '@synaptic-ai/atm';

const tool = new Tool();

const getCurrentTimeSchema = z.object({
  timeZone: z.string().describe("Timezone in Area/Location format (e.g., Europe/Amsterdam, America/New_York)")
}).describe("Parameters for getting current time in a specific timezone");

tool.addCapability({
  name: 'Get Current Time',
  description: 'Get the current time for a specific timezone',
  schema: getCurrentTimeSchema,
  runner: async (input) => {
    const { timeZone } = input;

    try {
      const response = await fetch(`https://timeapi.io/api/time/current/zone?timeZone=${encodeURIComponent(timeZone)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          error: responseText,
          status: response.status
        };
      }

      if (!response.ok) {
        return {
          error: data.message || "Failed to get time",
          status: response.status
        };
      }

      return {
        data: {
          timezone: data.timeZone,
          datetime: data.dateTime,
          date: data.date,
          time: data.time,
          day_of_week: data.dayOfWeek,
          utc_offset: data.offset
        },
        status: 200
      };
    } catch (error: any) {
      return {
        error: "Failed to fetch time",
        details: error?.message || "Unknown error",
        status: 500
      };
    }
  }
});

export default tool; 