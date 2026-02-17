/**
 * Interactive Google OAuth Setup for Calendar Import
 *
 * This script helps you obtain OAuth credentials for Google Calendar API access.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import { parse } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google API Configuration — set these in .env (see .env.example)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:8888/oauth2callback';

// Output path
const DATA_DIR = path.join(__dirname, '../data');
const TOKEN_FILE = path.join(DATA_DIR, 'google-token.json');

/**
 * Start local server to receive OAuth callback
 */
function startCallbackServer(oauth2Client: OAuth2Client): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url?.indexOf('/oauth2callback') > -1) {
          const qs = parse(req.url, true).query;
          const code = qs.code as string;

          if (!code) {
            res.end('Error: No authorization code received');
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          console.log('\nAuthorization code received!');

          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          // Save tokens
          if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
          }

          fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
          console.log(`Tokens saved to ${TOKEN_FILE}`);

          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);

          server.close();
          resolve();
        }
      } catch (error) {
        console.error('Error handling callback:', error);
        res.end('Error during authorization');
        server.close();
        reject(error);
      }
    });

    server.listen(8888, () => {
      console.log('Local callback server started on http://localhost:8888');
    });

    server.on('error', reject);
  });
}

/**
 * Main setup function
 */
async function main() {
  console.log('=== Google Calendar OAuth Setup ===\n');

  try {
    // Check if token already exists
    if (fs.existsSync(TOKEN_FILE)) {
      console.log(`Token file already exists: ${TOKEN_FILE}`);
      console.log('Do you want to re-authorize? (Delete the file manually if yes)');
      console.log('\nTo proceed with re-authorization, delete the file:');
      console.log(`  rm ${TOKEN_FILE}\n`);
      return;
    }

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      prompt: 'consent', // Force to get refresh token
    });

    console.log('Step 1: Starting local callback server...');
    const serverPromise = startCallbackServer(oauth2Client);

    console.log('\nStep 2: Please open this URL in your browser:\n');
    console.log(authUrl);
    console.log('\nWaiting for authorization...\n');

    // Wait for callback
    await serverPromise;

    console.log('\n=== Setup Complete ===');
    console.log('OAuth tokens saved successfully!');
    console.log('You can now run the calendar import preparation script:');
    console.log('  pnpm prepare:calendar\n');

  } catch (error) {
    console.error('\nSetup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
