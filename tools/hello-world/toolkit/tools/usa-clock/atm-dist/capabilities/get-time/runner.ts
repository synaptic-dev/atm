import { z } from "zod";
import schema from "./schema";

type ParamsType = z.infer<typeof schema>;

export default async (params: ParamsType) => {
  // Get current time in New York
  const now = new Date();
  let formattedTime;
  try {
    formattedTime = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
  } catch (error) {
    // Fallback if timezone is invalid
    formattedTime = now.toLocaleString();
  }
  return {
    time: formattedTime,
    iso: now.toISOString(),
    timezone: "America/New_York",
    unix: Math.floor(now.getTime() / 1000),
    region: "Eastern Time",
  };
};
