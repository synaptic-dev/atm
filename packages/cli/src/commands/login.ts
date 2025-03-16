import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

const AUTH_PORT = 42420;
const CONFIG_DIR = path.join(os.homedir(), '.openkit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function login() {
  const loginUrl = `http://localhost:4200/api/openkit/login?next=${encodeURIComponent(`http://localhost:${AUTH_PORT}`)}`;
  
  console.log('\nTo login to OpenKit, please visit xxxx:');
  console.log('\x1b[36m%s\x1b[0m', loginUrl); // Cyan color for URL
  console.log('\nWaiting for authentication...');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${AUTH_PORT}`);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');
    const userId = url.searchParams.get('user_id');
    const username = url.searchParams.get('username');
    const supabaseUrl = url.searchParams.get('supabase_url');
    const supabaseKey = url.searchParams.get('supabase_key');

    if (accessToken && refreshToken && userId && username && supabaseUrl && supabaseKey) {
      // Create config directory if it doesn't exist
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      // Save tokens, user_id, username, and Supabase credentials to config file
      const config = {
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: userId,
        username: username,
        supabase_url: supabaseUrl,
        supabase_key: supabaseKey,
        updated_at: new Date().toISOString()
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

      // Send success response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authentication Successful!</h1>
            <p>You can now close this window and return to the terminal.</p>
            <p>access_token: ${accessToken}</p>
            <p>refresh_token: ${refreshToken}</p>
            <p>user_id: ${userId}</p>
            <p>username: ${username}</p>
            <p>supabase_url: ${supabaseUrl}</p>
            <p>supabase_key: ${supabaseKey}</p>
          </body>
        </html>
      `);

      // Close server after successful authentication
      server.close(() => {
        console.log('\n✨ Authentication successful! You can now use OpenKit commands.');
        process.exit(0);
      });
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Missing required authentication information. Please try again.</p>
          </body>
        </html>
      `);
    }
  });

  server.listen(AUTH_PORT, () => {
    // console.log(`Local server started on port ${AUTH_PORT}`);
  });

  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${AUTH_PORT} is already in use. Please try again later.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}
