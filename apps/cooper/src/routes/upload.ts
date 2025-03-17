import { Hono } from "hono";
import { getSupabase } from "@/services/supabase/client";
import {
  decompressGzip,
  extractFileFromTar,
  listTarFiles,
  safeParseJson,
  toKebabCase,
} from "@/lib/helpers";
import { bearerAuth } from "hono/bearer-auth";
import { Env } from "@/types/env";

interface Capability {
  name: string;
  description: string;
  [key: string]: any; // For any other properties that might exist
}

interface CapabilityRecord {
  id: number;
  name: string;
  tool_id: number;
  description?: string;
}

const uploadRouter = new Hono<{ Bindings: Env }>();

uploadRouter.use(
  "*",
  bearerAuth({
    verifyToken: (token, c) => {
      console.log("Verifying token:", token);
      return true;
    },
  }),
);

uploadRouter.post("/", async (c) => {
  try {
    // Get access token from Authorization header
    const authHeader = c.req.header("Authorization") || "";
    let token = "";

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
      console.log("🚀 ~ uploadRouter.post ~ token:", token);
      if (!token) {
        return c.json(
          {
            success: false,
            error: "Invalid access token",
          },
          401,
        );
      }
    } else {
      return c.json(
        {
          success: false,
          error: "Authorization header with Bearer scheme is required",
        },
        401,
      );
    }

    console.log("Access token received:", token.substring(0, 10) + "...");

    console.log("All env variables:", c.env);
    const refreshToken = c.req.query("refreshToken");
    console.log("Refresh token:", refreshToken);

    // Create supabase client with the access token
    const supabase = await getSupabase(c.env, {
      access_token: token,
      refresh_token: refreshToken,
    });

    // Get user from the token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    console.log("User:", user, "Error:", error);

    if (error || !user) {
      console.error("Authentication error:", error);
      return c.json(
        {
          success: false,
          error: "Invalid or expired access token",
        },
        401,
      );
    }

    console.log("Authenticated user:", user.id);

    const contentType = c.req.header("content-type") || "";

    // Only accept application/x-gzip
    if (contentType !== "application/x-gzip") {
      return c.json(
        {
          success: false,
          error: "Only application/x-gzip content type is supported",
        },
        415,
      );
    }

    // Get userId from query parameter, return error if not provided
    const userId = c.req.query("userId");
    if (!userId) {
      return c.json(
        {
          success: false,
          error: "userId parameter is required",
        },
        400,
      );
    }

    // Get the raw gzip data
    const gzipData = new Uint8Array(await c.req.arrayBuffer());

    // Get filename from query parameter or generate a random one
    const filenameParam = c.req.query("filename");
    const filename =
      filenameParam ||
      `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.tar.gz`;

    try {
      // Decompress the gzip data using Web API
      const decompressedData = await decompressGzip(gzipData);
      console.log("Decompressed data length:", decompressedData.length);

      // List all files in the tar archive
      const files = listTarFiles(decompressedData);
      console.log("All files in tar:", files);

      // Try to find metadata.json in the tar file
      let metadataContent = extractFileFromTar(
        decompressedData,
        "metadata.json",
      );

      // If not found in the root, look for it in subdirectories
      if (!metadataContent) {
        // Find any file ending with metadata.json
        const metadataFile = files.find((file) =>
          file.endsWith("metadata.json"),
        );

        if (metadataFile) {
          metadataContent = extractFileFromTar(decompressedData, metadataFile);
        }
      }

      if (!metadataContent) {
        // Log the first bytes of the file for debugging
        const firstBytes = Array.from(decompressedData.slice(0, 20))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");

        return c.json(
          {
            success: false,
            error: "metadata.json not found in the archive",
            details: `Decompressed data starts with: ${firstBytes}`,
            files: files,
          },
          400,
        );
      }

      // Parse metadata.json
      const textDecoder = new TextDecoder("utf-8");
      const metadataStr = textDecoder.decode(metadataContent);

      try {
        // Use our safe parsing function to handle potentially malformed JSON
        const metadata = safeParseJson(metadataStr);
        console.log("Parsed metadata:", metadata);

        // Array to collect all uploaded file IDs
        const fileIds: string[] = [];

        // Process files based on tool type
        if (metadata.type === "single-capability" && metadata.name) {
          // For single-capability type, look for 'tool.ts' file
          const targetFileName = "tool.ts";
          console.log("Looking for target file:", targetFileName);

          // Try to find the target file in the tar
          const targetFileContent = extractFileFromTar(
            decompressedData,
            targetFileName,
          );

          // If not found directly, search for it anywhere in the archive
          if (!targetFileContent) {
            const possibleFiles = files.filter(
              (file) =>
                file.endsWith(`/${targetFileName}`) || file === targetFileName,
            );
            console.log("Possible target files:", possibleFiles);

            if (possibleFiles.length > 0) {
              // Get the first matching file
              const matchedFile = possibleFiles[0];
              const extractedContent = extractFileFromTar(
                decompressedData,
                matchedFile,
              );

              if (extractedContent) {
                // Create filename with userId prefix - remove .ts from fileId
                const fileId = `${userId}-${toKebabCase(metadata.name)}`;
                console.log(`Uploading and overwriting if exists: ${fileId}`);
                await c.env.openkit.put(fileId, extractedContent, {
                  httpMetadata: {
                    contentType: "application/typescript",
                  },
                });

                fileIds.push(fileId);
              }
            }
          } else {
            // Target file found, upload it to R2 with userId prefix - remove .ts from fileId
            const fileId = `${userId}-${toKebabCase(metadata.name)}`;
            console.log(`Uploading and overwriting if exists: ${fileId}`);
            await c.env.openkit.put(fileId, targetFileContent, {
              httpMetadata: {
                contentType: "application/typescript",
              },
            });

            fileIds.push(fileId);
          }

          if (fileIds.length === 0) {
            return c.json(
              {
                success: false,
                error: `Target TypeScript file '${targetFileName}' not found in the archive`,
                availableFiles: files,
              },
              400,
            );
          }
        } else if (
          metadata.type === "multi-capability" &&
          Array.isArray(metadata.capabilities)
        ) {
          // For multi-capability, first upload tool.ts file
          const toolFileName = "tool.ts";
          console.log("Looking for tool.ts file for multi-capability");

          // Get tool name in kebab case for file naming
          const toolName = metadata.name ? toKebabCase(metadata.name) : "tool";

          // Try to find the tool.ts file
          const toolFileContent = extractFileFromTar(
            decompressedData,
            toolFileName,
          );
          let toolFilePath = toolFileName;

          if (!toolFileContent) {
            // Search for tool.ts in subdirectories
            const possibleToolFiles = files.filter(
              (file) =>
                file.endsWith(`/${toolFileName}`) || file === toolFileName,
            );

            if (possibleToolFiles.length > 0) {
              toolFilePath = possibleToolFiles[0];
              const extractedToolContent = extractFileFromTar(
                decompressedData,
                toolFilePath,
              );

              if (extractedToolContent) {
                // Upload the tool.ts file - remove .ts from fileId and use tool name
                const toolFileId = `${userId}-${toolName}`;
                console.log(
                  `Uploading and overwriting if exists: ${toolFileId}`,
                );
                await c.env.openkit.put(toolFileId, extractedToolContent, {
                  httpMetadata: {
                    contentType: "application/typescript",
                  },
                });

                fileIds.push(toolFileId);
              } else {
                console.log("Failed to extract content from found tool.ts");
              }
            } else {
              console.log("Could not find tool.ts file in the archive");
            }
          } else {
            // Upload the tool.ts file - remove .ts from fileId and use tool name
            const toolFileId = `${userId}-${toolName}`;
            console.log(`Uploading and overwriting if exists: ${toolFileId}`);
            await c.env.openkit.put(toolFileId, toolFileContent, {
              httpMetadata: {
                contentType: "application/typescript",
              },
            });

            fileIds.push(toolFileId);
          }

          // Process each capability and find matching files
          for (const capability of metadata.capabilities) {
            if (capability.name) {
              const capabilityName = toKebabCase(capability.name);
              const capabilityFileName = `${capabilityName}.ts`;
              console.log("Looking for capability file:", capabilityFileName);

              // Try to find the capability file
              const capabilityContent = extractFileFromTar(
                decompressedData,
                capabilityFileName,
              );

              if (!capabilityContent) {
                // Look for the file in subdirectories
                const possibleCapFiles = files.filter(
                  (file) =>
                    file.endsWith(`/${capabilityFileName}`) ||
                    file === capabilityFileName,
                );

                if (possibleCapFiles.length > 0) {
                  const matchedFile = possibleCapFiles[0];
                  const extractedContent = extractFileFromTar(
                    decompressedData,
                    matchedFile,
                  );

                  if (extractedContent) {
                    // Use format: userId-[tool-name]-[cap-name] without .ts
                    const capFileId = `${userId}-${toolName}-${capabilityName}`;
                    console.log(
                      `Uploading and overwriting if exists: ${capFileId}`,
                    );
                    await c.env.openkit.put(capFileId, extractedContent, {
                      httpMetadata: {
                        contentType: "application/typescript",
                      },
                    });

                    fileIds.push(capFileId);
                  }
                } else {
                  console.log(
                    `Capability file ${capabilityFileName} not found in archive`,
                  );
                }
              } else {
                // Use format: userId-[tool-name]-[cap-name] without .ts
                const capFileId = `${userId}-${toolName}-${capabilityName}`;
                console.log(
                  `Uploading and overwriting if exists: ${capFileId}`,
                );
                await c.env.openkit.put(capFileId, capabilityContent, {
                  httpMetadata: {
                    contentType: "application/typescript",
                  },
                });

                fileIds.push(capFileId);
              }
            }
          }

          if (fileIds.length === 0) {
            return c.json(
              {
                success: false,
                error: "No files were found for the multi-capability tool",
                availableFiles: files,
              },
              400,
            );
          }
        } else {
          // For other types, upload the original gzip file with userId prefix
          // Remove .gz extension if present
          const baseFilename = filename.endsWith(".gz")
            ? filename.slice(0, -3)
            : filename;
          const filePathWithUserId = `${userId}-${baseFilename}`;
          console.log(
            `Uploading and overwriting if exists: ${filePathWithUserId}`,
          );
          await c.env.openkit.put(filePathWithUserId, gzipData, {
            httpMetadata: {
              contentType: "application/x-gzip",
            },
          });

          fileIds.push(filePathWithUserId);
        }

        // Always upsert tool data to Supabase regardless of type
        console.log("Upserting tool data to Supabase...");
        const { data, error } = await supabase
          .from("tools")
          .upsert(
            {
              name: metadata.name,
              description: metadata.description,
              type: metadata.type,
              owner_id: user.id,
              owner_username: user.user_metadata.user_name,
              tool_handle: toKebabCase(metadata.name),
            },
            {
              onConflict: "owner_id, tool_handle",
            },
          )
          .select("id")
          .single();

        if (error) {
          console.error("Error upserting tool to database:", error);
        } else if (data && data.id) {
          // Get the tool ID
          const toolId = data.id;
          console.log("Tool ID:", toolId);

          // Handle capabilities based on tool type
          if (
            metadata.type === "multi-capability" &&
            Array.isArray(metadata.capabilities)
          ) {
            try {
              // First, get existing capabilities for this tool to identify which ones to delete
              const { data: existingCapabilities, error: fetchError } =
                await supabase
                  .from("tool_capabilities")
                  .select("id, name")
                  .eq("tool_id", toolId);

              if (fetchError) {
                console.error(
                  "Error fetching existing capabilities:",
                  fetchError,
                );
              }

              // Prepare capability data with the tool_id
              const capabilitiesData = metadata.capabilities.map(
                (capability: Capability) => ({
                  tool_id: toolId,
                  name: capability.name,
                  description: capability.description,
                  key: toKebabCase(capability.name),
                }),
              );

              // 1. First, upsert the new capabilities (create/update)
              console.log("Upserting new capabilities...");
              const { error: upsertError } = await supabase
                .from("tool_capabilities")
                .upsert(capabilitiesData, {
                  onConflict: "tool_id, name",
                });

              if (upsertError) {
                console.error("Error upserting capabilities:", upsertError);
              } else {
                console.log("Successfully upserted capabilities");

                // 2. Now that new capabilities are safely stored, delete obsolete ones
                if (existingCapabilities) {
                  // Get new capability names
                  const newCapabilityNames = metadata.capabilities.map(
                    (cap: Capability) => cap.name,
                  );

                  // Find capabilities that aren't in the new set
                  const obsoleteCapabilities = existingCapabilities.filter(
                    (cap) => !newCapabilityNames.includes(cap.name),
                  );

                  if (obsoleteCapabilities.length > 0) {
                    const obsoleteIds = obsoleteCapabilities.map(
                      (cap) => cap.id,
                    );
                    console.log("Deleting obsolete capabilities:", obsoleteIds);

                    const { error: deleteError } = await supabase
                      .from("tool_capabilities")
                      .delete()
                      .in("id", obsoleteIds);

                    if (deleteError) {
                      console.error(
                        "Error deleting obsolete capabilities:",
                        deleteError,
                      );
                    } else {
                      console.log("Successfully deleted obsolete capabilities");
                    }
                  } else {
                    console.log("No obsolete capabilities to delete");
                  }
                }
              }
            } catch (e) {
              console.error("Error managing capabilities:", e);
            }
          } else if (metadata.type === "single-capability") {
            // For single-capability tools, upsert a single capability
            console.log("Upserting capability for single-capability tool");
            const { error: capError } = await supabase
              .from("tool_capabilities")
              .upsert(
                {
                  tool_id: toolId,
                  name: metadata.name,
                  description: metadata.description || "",
                  key: toKebabCase(metadata.name),
                },
                {
                  onConflict: "tool_id, name",
                },
              );

            if (capError) {
              console.error(
                "Error upserting capability for single-capability tool:",
                capError,
              );
            } else {
              console.log(
                "Successfully upserted capability for single-capability tool",
              );
            }
          }
        }

        console.log("Tool upsert completed");

        return c.json({
          success: true,
          fileIds,
          metadata,
        });
      } catch (jsonError) {
        // Provide detailed error information
        return c.json(
          {
            success: false,
            error: "Failed to parse metadata.json",
            details: String(jsonError),
            rawContent: metadataStr.substring(0, 200), // Show first 200 chars of raw content
          },
          400,
        );
      }
    } catch (decompressError) {
      return c.json(
        {
          success: false,
          error: "Failed to decompress gzip data",
          details: String(decompressError),
        },
        400,
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Add a debug endpoint to examine the contents of files in a tar.gz archive
uploadRouter.post("/debug-archive", async (c) => {
  try {
    // Get the raw gzip data
    const gzipData = new Uint8Array(await c.req.arrayBuffer());

    // Decompress the gzip data
    const decompressedData = await decompressGzip(gzipData);

    // List all files in the tar archive
    const files = listTarFiles(decompressedData);

    // Extract preview of each file
    const fileContents: Record<string, string> = {};
    for (const file of files) {
      const content = extractFileFromTar(decompressedData, file);
      if (content) {
        const textDecoder = new TextDecoder("utf-8");
        try {
          // Get first 200 chars of each file
          fileContents[file] = textDecoder.decode(content).substring(0, 200);
        } catch (e) {
          fileContents[file] =
            `[Binary content, size: ${content.length} bytes]`;
        }
      } else {
        fileContents[file] = "[Failed to extract]";
      }
    }

    return c.json({
      success: true,
      files,
      previews: fileContents,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: String(error),
      },
      400,
    );
  }
});

export default uploadRouter;
