import { z } from "zod";
import openkit from "@opkt/openkit";

/**
 * Current Time App - A simple single-route app that returns the current time
 */
const currentTimeApp = openkit
  .app({
    name: "CurrentTime",
    description: "A simple app that returns the current time",
  })
  .input(
    z.object({
      timezone: z
        .string()
        .optional()
        .describe("Optional timezone (defaults to UTC)"),
    }),
  )
  .handler(async ({ input }) => {
    const now = new Date();
    let timeString;

    if (input.timezone) {
      try {
        timeString = now.toLocaleString("en-US", { timeZone: input.timezone });
      } catch (e) {
        timeString = now.toISOString();
      }
    } else {
      timeString = now.toISOString();
    }

    return {
      currentTime: timeString,
      timestamp: now.getTime(),
    };
  });

export default currentTimeApp;
