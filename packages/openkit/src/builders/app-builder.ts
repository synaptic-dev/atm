import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  AppBuilderOptions,
  RouteBuilderOptions,
  AppBuilderObject,
  RouteBuilderObject,
  AppRunResult,
  Context,
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
export class AppBuilder<
  C extends Record<string, unknown> = Record<string, unknown>,
> implements AppBuilderObject<C>
{
  public name: string;
  public description: string;
  public routes: RouteBuilderObject<unknown, unknown, C>[] = [];
  private rootContext: C = {} as C;
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
  context<T extends Record<string, unknown>>(context: T): AppBuilder<T & C> {
    this.rootContext = {
      ...this.rootContext,
      ...context,
    } as unknown as C & T;
    return this as unknown as AppBuilder<T & C>;
  }

  /**
   * Add a route to the app
   * @param options Route configuration
   * @returns The created RouteBuilder instance
   */
  route(options: RouteBuilderOptions): RouteBuilder<unknown, unknown, C> {
    // Ensure path is provided
    if (!options.path) {
      throw new Error("Path is required for routes");
    }

    const routeBuilder = new RouteBuilder<unknown, unknown, C>(this, options);
    this.routes.push(routeBuilder);
    return routeBuilder;
  }

  /**
   * Enable debugging for this app and all its routes
   * @returns this AppBuilder instance
   */
  debug(): AppBuilder<C> {
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
  run<U = unknown>(routeName: string): AppRunResult<U, C> {
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
      throw new Error(`Route "${routeName}" not found`);
    }

    // If debug is enabled on app but not on route, enable it
    if (this._debugEnabled && route instanceof RouteBuilder) {
      route.debug();
    }

    return route.run(this.rootContext) as unknown as AppRunResult<U, C>;
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
        const routeContext = {
          ...this.rootContext,
          _fromToolCall: true,
          _appDebugEnabled: this._debugEnabled,
        };
        const runner = route.run(routeContext);

        // The result is what comes back from the route, which is now formatted by the LLM formatter in the route
        const result = await runner.handler({
          input: args,
          context: routeContext,
        });

        return result;
      }
    }

    return undefined;
  }
}
