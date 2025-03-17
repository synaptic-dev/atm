import { z } from "zod";
import { Tool, ToolCapability } from "@synaptic-ai/toolmaker";

// Weather schema - for getting weather information with location support
const weatherSchema = z.object({
  location: z
    .string()
    .describe("Location to get weather for (city name or coordinates)"),
  units: z
    .enum(["metric", "imperial"])
    .optional()
    .describe("Units system to use (defaults to metric)"),
});

// Define the types for params to fix TypeScript errors
type WeatherParams = z.infer<typeof weatherSchema>;

// Get Current Weather capability
export const getCurrentWeather = new ToolCapability({
  name: "Get Current Weather",
  description:
    "Returns the current weather conditions for a specified location",
  schema: weatherSchema,
  runner: async (params: WeatherParams) => {
    // In a real implementation, this would call a weather API
    // For demonstration purposes, we'll simulate a response

    try {
      const location = params.location;
      const units = params.units || "metric";

      // Simulated weather data
      // In production, this would be replaced with an actual API call
      // to a service like OpenWeatherMap, WeatherAPI, etc.

      const tempUnit = units === "metric" ? "°C" : "°F";
      const speedUnit = units === "metric" ? "km/h" : "mph";

      // Generate somewhat realistic random weather data
      const temp = Math.round(15 + Math.random() * 15); // 15-30 or 59-86
      const humidity = Math.round(40 + Math.random() * 40); // 40-80%
      const windSpeed = Math.round(5 + Math.random() * 20); // 5-25

      const conditions = [
        "Sunny",
        "Partly Cloudy",
        "Cloudy",
        "Light Rain",
        "Thunderstorm",
        "Clear",
      ];
      const condition =
        conditions[Math.floor(Math.random() * conditions.length)];

      return {
        location: location,
        units: units,
        current: {
          temperature: temp,
          temperatureUnit: tempUnit,
          condition: condition,
          humidity: humidity,
          windSpeed: windSpeed,
          windSpeedUnit: speedUnit,
          lastUpdated: new Date().toISOString(),
        },
        message: `Current weather in ${location}: ${temp}${tempUnit}, ${condition}, Humidity: ${humidity}%, Wind: ${windSpeed} ${speedUnit}`,
      };
    } catch (error: unknown) {
      return {
        error: `Failed to retrieve weather information: ${error instanceof Error ? error.message : String(error)}`,
        location: params.location,
      };
    }
  },
});

// Get Weather Forecast capability
export const getWeatherForecast = new ToolCapability({
  name: "Get Weather Forecast",
  description:
    "Returns the weather forecast for the next few days for a specified location",
  schema: weatherSchema,
  runner: async (params: WeatherParams) => {
    try {
      const location = params.location;
      const units = params.units || "metric";

      // Simulated forecast data
      const tempUnit = units === "metric" ? "°C" : "°F";
      const speedUnit = units === "metric" ? "km/h" : "mph";

      const conditions = [
        "Sunny",
        "Partly Cloudy",
        "Cloudy",
        "Light Rain",
        "Thunderstorm",
        "Clear",
      ];

      // Generate a 5-day forecast
      const forecast = Array.from({ length: 5 }, (_, i) => {
        const dayTemp = Math.round(15 + Math.random() * 15);
        const nightTemp = dayTemp - 5 - Math.floor(Math.random() * 5);
        const condition =
          conditions[Math.floor(Math.random() * conditions.length)];
        const windSpeed = Math.round(5 + Math.random() * 15);
        const date = new Date();
        date.setDate(date.getDate() + i + 1);

        return {
          date: date.toISOString().split("T")[0],
          dayTemp,
          nightTemp,
          condition,
          windSpeed,
          humidity: Math.round(40 + Math.random() * 40),
        };
      });

      return {
        location,
        units,
        forecast,
        message: `Weather forecast for ${location} for the next 5 days`,
      };
    } catch (error: unknown) {
      return {
        error: `Failed to retrieve weather forecast: ${error instanceof Error ? error.message : String(error)}`,
        location: params.location,
      };
    }
  },
});

// Create a multi-capability weather tool
const weatherTool = new Tool({
  name: "Weather",
  description: "A tool for retrieving weather information for any location",
  capabilities: [getCurrentWeather, getWeatherForecast],
});

export default weatherTool;
