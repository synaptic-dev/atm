# Weather Tool

A single-capability tool for retrieving real-time weather information for any location. This tool provides current weather conditions including temperature, humidity, wind speed, and general conditions.

## Features

- **Current Weather**: Get real-time weather data for any location
- **Unit Selection**: Choose between metric (°C, km/h) and imperial (°F, mph) units
- **Simple Interface**: Easy to use with just a location parameter

## Usage

```typescript
import weather from './tools/weather';

// Using the default exported tool (single capability)
const result = await weather.run({
  location: "New York City",
  units: "imperial" // optional, defaults to metric
});

console.log(result.message);
// Example output: "Current weather in New York City: 72°F, Partly Cloudy, Humidity: 65%, Wind: 12 mph"

// Using the specific exported capability
import { getCurrentWeather } from './tools/weather';

const weatherData = await getCurrentWeather.run({
  location: "Tokyo",
  units: "metric"
});

console.log(weatherData);
/*
{
  location: "Tokyo",
  units: "metric",
  current: {
    temperature: 23,
    temperatureUnit: "°C",
    condition: "Sunny",
    humidity: 58,
    windSpeed: 15,
    windSpeedUnit: "km/h",
    lastUpdated: "2023-04-12T08:30:00.000Z"
  },
  message: "Current weather in Tokyo: 23°C, Sunny, Humidity: 58%, Wind: 15 km/h"
}
*/
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| location | string | Yes | Location to get weather for (city name or coordinates) |
| units | 'metric' \| 'imperial' | No | Units system to use (defaults to metric) |

## Return Value

The tool returns an object with the following properties:

- `location`: The requested location
- `units`: The units system used
- `current`: Object containing detailed weather information
  - `temperature`: The current temperature
  - `temperatureUnit`: The unit for temperature (°C or °F)
  - `condition`: Text describing the weather condition
  - `humidity`: Humidity percentage
  - `windSpeed`: The current wind speed
  - `windSpeedUnit`: The unit for wind speed (km/h or mph)
  - `lastUpdated`: ISO timestamp of when the data was retrieved
- `message`: A formatted string with the weather summary

## Note

This is a simulated weather tool. In a production environment, you would integrate with a weather API service like OpenWeatherMap, WeatherAPI, or similar. 