import { z } from 'zod';
import { Tool, ToolCapability } from '@synaptic-ai/toolmaker';

// Time schema - for getting current time with timezone support
const timeSchema = z.object({
  timezone: z.string().optional().describe("Optional timezone (defaults to local timezone)")
});

// Date schema - for getting current date with format options
const dateSchema = z.object({
  format: z.enum(['short', 'medium', 'long', 'full']).optional().describe("Date format (defaults to medium)"),
  timezone: z.string().optional().describe("Optional timezone (defaults to local timezone)")
});

// Countdown schema - for creating a countdown timer
const countdownSchema = z.object({
  target: z.string().describe("Target date/time for countdown (ISO format)"),
  units: z.array(z.enum(['days', 'hours', 'minutes', 'seconds'])).optional().describe("Units to include in countdown")
});

// Time capability
export const getTime = new ToolCapability({
  name: 'Get Time',
  description: 'Returns the current time, optionally in a specific timezone',
  schema: timeSchema,
  runner: async (params) => {
    // Get current time
    const now = new Date();
    
    let formattedTime;
    try {
      // Format with timezone if provided
      if (params.timezone) {
        formattedTime = now.toLocaleTimeString('en-US', { timeZone: params.timezone });
      } else {
        formattedTime = now.toLocaleTimeString();
      }
    } catch (error) {
      // Fallback if timezone is invalid
      formattedTime = now.toLocaleTimeString();
    }
    
    return {
      time: formattedTime,
      timezone: params.timezone || 'local',
      timestamp: now.getTime()
    };
  }
});

// Date capability
export const getDate = new ToolCapability({
  name: 'Get Date',
  description: 'Returns the current date in various formats',
  schema: dateSchema,
  runner: async (params) => {
    // Get current date
    const now = new Date();
    
    // Handle date formatting
    const format = params.format || 'medium';
    
    const formatOptions = {
      short: { dateStyle: 'short' },
      medium: { dateStyle: 'medium' },
      long: { dateStyle: 'long' },
      full: { dateStyle: 'full' }
    };
    
    let formattedDate;
    try {
      // Format with timezone if provided
      if (params.timezone) {
        formattedDate = now.toLocaleDateString('en-US', { 
          ...formatOptions[format], 
          timeZone: params.timezone 
        });
      } else {
        formattedDate = now.toLocaleDateString('en-US', formatOptions[format]);
      }
    } catch (error) {
      // Fallback if timezone or format is invalid
      formattedDate = now.toLocaleDateString();
    }
    
    return {
      date: formattedDate,
      format: format,
      timezone: params.timezone || 'local',
      timestamp: now.getTime()
    };
  }
});

// Countdown capability
export const getCountdown = new ToolCapability({
  name: 'Get Countdown',
  description: 'Calculates time remaining until a target date/time',
  schema: countdownSchema,
  runner: async (params) => {
    const now = new Date();
    const target = new Date(params.target);
    
    if (isNaN(target.getTime())) {
      return {
        error: "Invalid target date format. Please use ISO format (e.g. 2023-12-31T23:59:59Z)"
      };
    }
    
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return {
        expired: true,
        message: "The target date has already passed"
      };
    }
    
    // Calculate different units
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const units = params.units || ['days', 'hours', 'minutes', 'seconds'];
    
    const result: Record<string, any> = {
      target: params.target,
      remaining: {}
    };
    
    if (units.includes('days')) {
      result.remaining.days = days;
    }
    
    if (units.includes('hours')) {
      result.remaining.hours = hours % 24;
    }
    
    if (units.includes('minutes')) {
      result.remaining.minutes = minutes % 60;
    }
    
    if (units.includes('seconds')) {
      result.remaining.seconds = seconds % 60;
    }
    
    // Total remaining in milliseconds
    result.remainingMs = diffMs;
    
    return result;
  }
});

// Multi-capability clock tool
const clock = new Tool({
  name: 'Clock',
  description: 'A multi-capability tool for time-related operations',
  capabilities: [getTime, getDate, getCountdown]
});

export default clock; 