import { z } from 'zod';
import { Tool, ToolCapability } from '@synaptic-ai/toolmaker';

// Weather schema - for getting weather information with location support
const weatherSchema = z.object({
  location: z.string().describe("Location to get weather for (city name or coordinates)"),
  units: z.enum(['metric', 'imperial']).optional().describe("Units system to use (defaults to metric)")
});

// Weather capability
export const getCurrentWeather = new ToolCapability({
  name: 'Get Current Weather',
  description: 'Returns the current weather conditions for a specified location',
  schema: weatherSchema,
  runner: async (params) => {
    // In a real implementation, this would call a weather API
    // For demonstration purposes, we'll simulate a response
    
    try {
      const location = params.location;
      const units = params.units || 'metric';
      
      // Simulated weather data
      // In production, this would be replaced with an actual API call
      // to a service like OpenWeatherMap, WeatherAPI, etc.
      
      const tempUnit = units === 'metric' ? '°C' : '°F';
      const speedUnit = units === 'metric' ? 'km/h' : 'mph';
      
      // Generate somewhat realistic random weather data
      const temp = Math.round(15 + Math.random() * 15); // 15-30 or 59-86
      const humidity = Math.round(40 + Math.random() * 40); // 40-80%
      const windSpeed = Math.round(5 + Math.random() * 20); // 5-25
      
      const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Thunderstorm', 'Clear'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
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
          lastUpdated: new Date().toISOString()
        },
        message: `Current weather in ${location}: ${temp}${tempUnit}, ${condition}, Humidity: ${humidity}%, Wind: ${windSpeed} ${speedUnit}`
      };
    } catch (error) {
      return {
        error: `Failed to retrieve weather information: ${error.message}`,
        location: params.location
      };
    }
  }
});

// Single-capability weather tool
const weather = new Tool({
  name: 'Weather',
  description: 'A tool for retrieving weather information for any location',
  schema: weatherSchema,
  runner: async (params) => {
    // This single-capability tool simply calls the getCurrentWeather capability
    try {
      const location = params.location;
      const units = params.units || 'metric';
      
      // Simulated weather data
      const tempUnit = units === 'metric' ? '°C' : '°F';
      const speedUnit = units === 'metric' ? 'km/h' : 'mph';
      
      // Generate somewhat realistic random weather data
      const temp = Math.round(15 + Math.random() * 15);
      const humidity = Math.round(40 + Math.random() * 40);
      const windSpeed = Math.round(5 + Math.random() * 20);
      
      const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Thunderstorm', 'Clear'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
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
          lastUpdated: new Date().toISOString()
        },
        message: `Current weather in ${location}: ${temp}${tempUnit}, ${condition}, Humidity: ${humidity}%, Wind: ${windSpeed} ${speedUnit}`
      };
    } catch (error) {
      return {
        error: `Failed to retrieve weather information: ${error.message}`,
        location: params.location
      };
    }
  }
});

export default weather; 