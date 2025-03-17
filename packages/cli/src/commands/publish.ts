import path from "path";
import fs from "fs";
import os from "os";
import tar from "tar";
import fetch from "node-fetch";
import http from "http";

const AUTH_PORT = 42420;
const COOPER_URL = "https://cooper.openkit.fun";
const OPENKIT_URL = "https://openkit.fun";

interface PublishOptions {
  target?: string;
}

// Helper function to find all tool files recursively
function findToolFiles(directory: string): { path: string; name: string }[] {
  const result: { path: string; name: string }[] = [];

  // Get all entries in the directory
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const subDirTools = findToolFiles(entryPath);
      result.push(...subDirTools);
    } else if (entry.name.endsWith(".ts")) {
      // Add TypeScript files to the result
      result.push({
        path: entryPath,
        name: entry.name.slice(0, -3), // Remove .ts extension
      });
    }
  }

  return result;
}

// Upload a tool as a tarball to the API
async function uploadToolTarball(
  userId: string,
  toolName: string,
  targetDir: string,
  accessToken: string,
  refreshToken: string,
  spinner: any,
): Promise<boolean> {
  const tarballPath = path.join(os.tmpdir(), `${toolName}.tar.gz`);

  try {
    // Create a tarball of the directory
    await tar.create(
      {
        gzip: true,
        file: tarballPath,
        cwd: path.dirname(targetDir),
      },
      [path.basename(targetDir)],
    );

    // Upload the tarball to the API
    const fileContent = fs.readFileSync(tarballPath);

    spinner.text = `Uploading ${toolName} to API...`;
    const response = await fetch(
      `${COOPER_URL}/upload?userId=${encodeURIComponent(userId)}&refreshToken=${encodeURIComponent(refreshToken)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-gzip",
          "Tool-Name": toolName,
          Authorization: `Bearer ${accessToken}`,
        },
        body: fileContent,
      },
    );

    // Clean up the temporary file
    fs.unlinkSync(tarballPath);

    if (response.ok) {
      return true;
    } else {
      console.error("Upload failed:", response.statusText);
      return false;
    }
  } catch (err) {
    console.error("Error creating or uploading tarball:", err);
    // Clean up if file exists
    if (fs.existsSync(tarballPath)) {
      fs.unlinkSync(tarballPath);
    }
    return false;
  }
}

export async function publishTool(options: PublishOptions = {}): Promise<void> {
  // Dynamically import ora
  let ora;
  try {
    ora = (await import("ora")).default;
  } catch (error) {
    console.error("Failed to initialize. Please try again.");
    process.exit(1);
  }

  // Log directly first to ensure visibility
  console.log("Publishing to OpenKit...");

  let spinner = ora("").start();

  try {
    // Get the target directory
    const targetDir = options.target || "openkit-dist";
    const targetPath = path.resolve(process.cwd(), targetDir);

    // Check if target directory exists
    if (!fs.existsSync(targetPath)) {
      spinner.fail(`No ${targetDir} directory found`);
      console.error(`Directory ${targetDir} does not exist.`);
      process.exit(1);
    }

    // Find all tool files in target directory and its subdirectories
    let toolFiles;
    try {
      toolFiles = findToolFiles(targetPath);
    } catch (error) {
      spinner.fail("Failed to read directory contents");
      console.error(`Error reading ${targetDir} directory:`, error);
      process.exit(1);
    }

    if (toolFiles.length === 0) {
      spinner.fail("No tools found");
      console.error(
        `No tool files found in ${targetDir} or its subdirectories`,
      );
      process.exit(1);
    }

    // Show how many tools were found
    spinner.succeed(`Found ${toolFiles.length} tools to publish`);
    spinner.stop();

    // Start the authentication server
    return new Promise((resolve, reject) => {
      // Set up server to receive authentication tokens
      const publishUrl = `${OPENKIT_URL}/publish`;

      console.log("\nTo publish your tools to OpenKit, please confirm at:");
      console.log("\x1b[36m%s\x1b[0m", publishUrl); // Cyan color for URL
      console.log("\nWaiting for confirmation...");

      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url!, `http://localhost:${AUTH_PORT}`);
        const accessToken = url.searchParams.get("access_token");
        const userId = url.searchParams.get("user_id");
        const returnUrl = url.searchParams.get("return_url");
        const refreshToken = url.searchParams.get("refresh_token") || "";

        if (accessToken && userId) {
          // Send success response
          res.writeHead(302, {
            "Content-Type": "text/html",
            // If a return_url was provided, redirect to it
            Location: returnUrl || "/",
          });

          if (!returnUrl) {
            // Only show HTML content if no return URL was provided
            res.end(`
              <html>
                <body>
                  <h1>Publication Confirmed!</h1>
                  <p>You can now close this window and return to the terminal.</p>
                </body>
              </html>
            `);
          } else {
            // For redirects, just end the response
            res.end();
          }

          // Close server after successful authentication
          server.close();

          // Now proceed with the publishing using the received tokens
          spinner = ora("").start();

          // Process each tool
          for (const toolFile of toolFiles) {
            // Extract tool name from path
            const toolName = toolFile.name;
            const toolPath = path.dirname(toolFile.path);

            // Log directly for visibility of tool publishing
            spinner.text = `Publishing tool: ${toolName} from ${toolPath}`;

            // Upload the tool file as a tarball
            const success = await uploadToolTarball(
              userId,
              toolName,
              toolPath,
              accessToken,
              refreshToken,
              spinner,
            );

            if (!success) {
              spinner.fail(`Failed to publish tool: ${toolName}`);
              reject(new Error(`Failed to publish tool: ${toolName}`));
              return;
            }

            // Success!
            spinner.succeed(`Published tool: ${toolName}`);
          }

          console.log(`\nTools published successfully! 🚀`);
          resolve();
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body>
                <h1>Publication Failed</h1>
                <p>Missing required authentication information. Please try again.</p>
              </body>
            </html>
          `);
        }
      });

      server.listen(AUTH_PORT, () => {
        // Server is listening
      });

      // Handle server errors
      server.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          console.error(
            `Port ${AUTH_PORT} is already in use. Please try again later.`,
          );
        } else {
          console.error("Server error:", error);
        }
        reject(error);
      });
    });
  } catch (error: any) {
    spinner.fail("Publishing failed");
    console.error(error?.message || error);
    process.exit(1);
  }
}
