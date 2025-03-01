import { z } from "zod";
import schema from "./schema";

type ParamsType = z.infer<typeof schema>;

export default async (params: ParamsType) => {
  // Get current time
  const now = new Date();
  let formattedTime;
  try {
    // Format with timezone if provided
    if (params.timezone) {
      formattedTime = now.toLocaleString("en-US", {
        timeZone: params.timezone,
      });
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
    timezone: params.timezone || "local",
    unix: Math.floor(now.getTime() / 1000),
  };
};
