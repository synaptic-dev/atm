import { Hono } from "hono";
import { Env } from "@/types/env";

const filesRouter = new Hono<{ Bindings: Env }>();

filesRouter.get("/:userId/:filename", async (c) => {
  const userId = c.req.param("userId");
  const filename = c.req.param("filename");

  // Build the file path without .ts extension for the lookup
  const filePath = `${userId}-${filename}`;

  // Add .ts extension for content type
  const filePathWithExtension = `${filePath}.ts`;

  console.log("Getting file:", filePath);

  try {
    const file = await c.env.openkit.get(filePath);

    if (!file) {
      console.log("File not found:", filePath);
      return c.json(
        {
          success: false,
          error: "File not found",
          requestedPath: filePath,
        },
        404,
      );
    }

    console.log(
      "File found:",
      filePath,
      "Content-Type:",
      file.httpMetadata?.contentType,
    );

    // Determine filename for Content-Disposition header
    const downloadFilename = filename.endsWith(".ts")
      ? filename
      : `${filename}.ts`;

    // Return the file with proper content type
    return new Response(file.body, {
      headers: {
        "Content-Type":
          file.httpMetadata?.contentType || "application/typescript",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    return c.json(
      {
        success: false,
        error: String(error),
        requestedPath: filePath,
      },
      500,
    );
  }
});

export default filesRouter;
