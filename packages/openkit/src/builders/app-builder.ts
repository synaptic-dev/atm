import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  AppBuilderOptions,
  RouteBuilderOptions,
  HandlerFunction,
  MiddlewareFunction,
  AppBuilderObject,
  RouteBuilderObject,
  AppRunResult,
  Context,
  LLMFormatterOptions,
  OpenAIFunctionDefinition,
} from "./types";
import { RouteBuilder } from "./route-builder";
import pino from "pino";

// Create a logger instance with a lower log level to make logs visible
const logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: true,
      ignore: "pid,hostname",
      messageFormat: "{msg}",
    },
  },
});

// Log boundary to make debug logs more visible
const logBoundary =
  "========================== OpenKit Debug =============================";

/**
 * Builder for creating App instances with a fluent API
 */
export class AppBuilder implements AppBuilderObject {
  public name: string;
  public description: string;
  public routes: RouteBuilderObject[] = [];
  private rootContext: Context = {};
  private _debugEnabled: boolean = false;

  /**
   * Create a new AppBuilder
   * @param options App configuration options
   */
  constructor(options: AppBuilderOptions) {
    this.name = options.name;
    this.description = options.description || "";
  }

  /**
   * Set the root context for the app
   * This context will be merged with any context provided at runtime
   * @param context Context object with dependencies to inject
   * @returns this AppBuilder instance
   */
  context(context: Context): AppBuilder {
    this.rootContext = { ...this.rootContext, ...context };
    return this;
  }

  /**
   * Add a route to the app
   * @param options Route configuration
   * @returns RouteBuilder for the new route
   */
  route(options: RouteBuilderOptions): RouteBuilder {
    // Ensure path is provided
    if (!options.path) {
      throw new Error("Path is required for routes");
    }

    const routeBuilder = new RouteBuilder(this, options);
    this.routes.push(routeBuilder);
    return routeBuilder;
  }

  /**
   * Enable debugging for this app and all its routes
   * @returns this AppBuilder instance
   */
  debug(): AppBuilder {
    this._debugEnabled = true;

    // Enable debug for all routes
    for (const route of this.routes) {
      if (route instanceof RouteBuilder) {
        route.debug();
      }
    }

    return this;
  }

  /**
   * Create a runner for direct invocation of a route
   * @param routeName Name or path of the route to run
   * @returns Object with handler function for executing the route
   */
  run<T = any>(routeName: string): AppRunResult<T> {
    const startTime = Date.now();

    // Debug logging if enabled
    if (this._debugEnabled) {
      // Show boundary only at the very beginning
      logger.debug(logBoundary);
      logger.info({
        event: "route_run_start",
        msg: `App ${this.name} - Running route: ${routeName}`,
        app_name: this.name,
        app_description: this.description,
        route: routeName,
        context: this.rootContext,
      });
    }

    // Find the route by name or path
    const route = this.routes.find(
      (r) =>
        r.name.toLowerCase() === routeName.toLowerCase() ||
        r.name.toLowerCase().replace(/\s+/g, "_") ===
          routeName.toLowerCase().replace(/\s+/g, "_") ||
        r.path === routeName,
    );

    if (!route) {
      // Debug route not found
      if (this._debugEnabled) {
        // Log error and show boundary at the very end
        logger.error({
          event: "route_not_found",
          msg: `App ${this.name} - Route not found: ${routeName}`,
          app_name: this.name,
          app_description: this.description,
          route: routeName,
          duration: Date.now() - startTime,
        });
        logger.debug(logBoundary);
      }
      throw new Error(`Route "${routeName}" not found`);
    }

    // If debug is enabled on app but not on route, enable it
    if (this._debugEnabled && route instanceof RouteBuilder) {
      route.debug();
    }

    return route.run(this.rootContext);
  }

  /**
   * Create OpenAI function definitions for this app
   * @returns Array of OpenAI function definitions
   */
  getOpenAIFunctions(): OpenAIFunctionDefinition[] {
    if (this.routes.length === 0) {
      throw new Error("App has no routes defined");
    }

    // For multi-route apps, create a function for each route
    return this.routes.map((route) => {
      // If this is a RouteBuilder instance, use its method
      if (route instanceof RouteBuilder) {
        const func = route._toOpenAIFunction();

        // Prefix the function name with the app name
        func.function.name = `${this.name.toLowerCase().replace(/\s+/g, "_")}-${route.path.replace(
          /\//g,
          "",
        )}`;

        return func;
      }

      // Otherwise, fall back to manual construction
      const schema = route.inputSchema || z.object({});
      const jsonSchema = zodToJsonSchema(schema);

      return {
        type: "function",
        function: {
          name: `${this.name.toLowerCase().replace(/\s+/g, "_")}-${route.path}`,
          description: route.description,
          parameters: jsonSchema as any,
        },
      };
    });
  }

  /**
   * Get a route by name or path
   * @param nameOrPath Name or path of the route to get
   * @returns The route builder or undefined if not found
   */
  getRoute(nameOrPath: string): RouteBuilder | undefined {
    return this.routes.find(
      (r) =>
        r.name.toLowerCase() === nameOrPath.toLowerCase() ||
        r.name.toLowerCase().replace(/\s+/g, "_") ===
          nameOrPath.toLowerCase().replace(/\s+/g, "_") ||
        r.path === nameOrPath,
    ) as RouteBuilder | undefined;
  }

  /**
   * Handle a tool call from OpenAI
   * @param functionName Name of the function to execute
   * @param args Arguments for the function
   * @returns Result of the function execution
   */
  async handleToolCall(functionName: string, args: any): Promise<any> {
    const startTime = Date.now();

    if (this._debugEnabled) {
      // Show boundary only at the very beginning
      logger.debug(logBoundary);
      logger.info({
        event: "tool_call_start",
        msg: `App ${this.name} - Tool call started: ${functionName}`,
        app_name: this.name,
        app_description: this.description,
        function: functionName,
        input: args,
      });
    }

    // For multi-route apps, check if the function name matches app-route pattern
    const appPrefix = `${this.name.toLowerCase().replace(/\s+/g, "_")}-`;
    if (functionName.startsWith(appPrefix)) {
      // Extract the route path
      const routePath = functionName.substring(appPrefix.length);

      // Find the route by path
      const route = this.routes.find(
        (r) => r.path.replace(/\//g, "") === routePath,
      );

      if (route) {
        // Execute the route with a context flag indicating this is from a tool call
        const routeContext = { ...this.rootContext, _fromToolCall: true };
        const runner = route.run(routeContext);
        const result = await runner.handler({
          input: args,
          context: {},
        });

        if (this._debugEnabled) {
          // Log the result and show boundary only at the very end
          logger.info({
            event: "tool_call_complete",
            msg: `App ${this.name} - Tool call completed: ${functionName} (${routePath})`,
            app_name: this.name,
            app_description: this.description,
            function: functionName,
            route: routePath,
            input: args,
            output: result,
            duration: Date.now() - startTime,
          });
          logger.debug(logBoundary);
        }

        return result;
      }
    }

    if (this._debugEnabled) {
      // Log unhandled call and show boundary at the very end
      logger.warn({
        event: "tool_call_unhandled",
        msg: `App ${this.name} - Unhandled tool call: ${functionName}`,
        app_name: this.name,
        app_description: this.description,
        function: functionName,
        input: args,
        duration: Date.now() - startTime,
      });
      logger.debug(logBoundary);
    }

    return undefined;
  }
}
