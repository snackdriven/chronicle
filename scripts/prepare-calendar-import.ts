/**
 * Phase 3 - Agent A: Google Calendar Import Preparation
 *
 * Fetches all calendar events from 2021-2026 and caches them locally.
 * Does NOT write to database - this is the PREPARATION phase.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google API Configuration — set these in .env (see .env.example)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// Date range for import
const START_DATE = '2021-01-01T00:00:00Z';
const END_DATE = '2026-12-31T23:59:59Z';

// Output paths
const DATA_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(DATA_DIR, 'calendar-cache.json');
const PLAN_FILE = path.join(DATA_DIR, 'calendar-import-plan.json');
const TOKEN_FILE = path.join(DATA_DIR, 'google-token.json');

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  created?: string;
  updated?: string;
  htmlLink?: string;
}

interface CachedEvent {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  metadata: {
    location?: string;
    attendees?: string[];
    description?: string;
    start_date?: string;
    end_date?: string;
    html_link?: string;
    created?: string;
    updated?: string;
  };
  original: GoogleCalendarEvent;
}

interface ImportPlan {
  ready: boolean;
  totalEvents: number;
  dateRange: {
    start: string;
    end: string;
  };
  uniqueAttendees: string[];
  cacheFile: string;
  errors: string[];
  generatedAt: string;
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Load saved token from file
 */
function loadToken(): any | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      console.log('Loaded saved OAuth token');
      return token;
    }
  } catch (error) {
    console.error('Error loading token:', error);
  }
  return null;
}

/**
 * Save token to file
 */
function saveToken(token: any): void {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
  console.log(`Token saved to ${TOKEN_FILE}`);
}

/**
 * Authenticate with Google Calendar API
 */
async function authenticate(): Promise<OAuth2Client> {
  const oauth2Client = createOAuth2Client();

  // Try to load existing token
  const savedToken = loadToken();

  if (savedToken) {
    oauth2Client.setCredentials(savedToken);

    // Check if token is expired
    if (savedToken.expiry_date && savedToken.expiry_date > Date.now()) {
      console.log('Using valid saved token');
      return oauth2Client;
    }

    // Try to refresh token
    if (savedToken.refresh_token) {
      try {
        console.log('Refreshing expired token...');
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        saveToken(credentials);
        return oauth2Client;
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }
  }

  // Need new authorization
  console.log('\n=== Google Calendar Authorization Required ===');
  console.log('Please visit this URL to authorize access:\n');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent', // Force to get refresh token
  });

  console.log(authUrl);
  console.log('\nAfter authorizing, you will be redirected to a URL.');
  console.log('Copy the "code" parameter from that URL and paste it here.\n');

  // In a real implementation, you'd set up a local server to catch the redirect
  // For now, we'll require manual token entry
  throw new Error('Manual OAuth flow required. Please set up token manually.');
}

/**
 * Fetch all events from Google Calendar with pagination
 */
async function fetchAllEvents(
  calendar: any,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent[]> {
  const allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  console.log(`Fetching events from ${START_DATE} to ${END_DATE}...`);

  do {
    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: START_DATE,
        timeMax: END_DATE,
        maxResults: 250, // Max allowed by API
        singleEvents: true,
        orderBy: 'startTime',
        pageToken,
      });

      const events = response.data.items || [];
      allEvents.push(...events);
      pageCount++;

      console.log(`Page ${pageCount}: Fetched ${events.length} events (Total: ${allEvents.length})`);

      pageToken = response.data.nextPageToken;

      // Rate limiting: wait 100ms between requests
      if (pageToken) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      if (error.code === 429) {
        console.log('Rate limit hit, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  } while (pageToken);

  console.log(`\nTotal events fetched: ${allEvents.length}`);
  return allEvents;
}

/**
 * Transform Google Calendar event to Memory Shack format
 */
function transformEvent(event: GoogleCalendarEvent): CachedEvent | null {
  // Skip events without start time
  if (!event.start?.dateTime && !event.start?.date) {
    return null;
  }

  // Get timestamp
  const startTime = event.start.dateTime || event.start.date;
  const timestamp = new Date(startTime!).getTime();

  if (isNaN(timestamp)) {
    console.warn(`Invalid timestamp for event ${event.id}`);
    return null;
  }

  return {
    id: event.id,
    timestamp,
    type: 'calendar_event',
    title: event.summary || 'Untitled Event',
    metadata: {
      location: event.location,
      attendees: event.attendees?.map(a => a.email),
      description: event.description?.substring(0, 200), // Truncate for metadata
      start_date: event.start?.dateTime || event.start?.date,
      end_date: event.end?.dateTime || event.end?.date,
      html_link: event.htmlLink,
      created: event.created,
      updated: event.updated,
    },
    original: event, // Keep full event for later database insertion
  };
}

/**
 * Extract unique attendees from all events
 */
function extractUniqueAttendees(events: CachedEvent[]): string[] {
  const attendeeSet = new Set<string>();

  events.forEach(event => {
    if (event.metadata.attendees) {
      event.metadata.attendees.forEach(email => attendeeSet.add(email));
    }
  });

  return Array.from(attendeeSet).sort();
}

/**
 * Validate cached data
 */
function validateCachedData(events: CachedEvent[]): string[] {
  const errors: string[] = [];
  const eventIds = new Set<string>();

  events.forEach((event, index) => {
    // Check for valid timestamp
    if (!event.timestamp || isNaN(event.timestamp)) {
      errors.push(`Event ${index}: Invalid timestamp`);
    }

    // Check for duplicate IDs
    if (eventIds.has(event.id)) {
      errors.push(`Event ${index}: Duplicate ID ${event.id}`);
    }
    eventIds.add(event.id);

    // Check date range
    const eventDate = new Date(event.timestamp);
    const startDate = new Date(START_DATE);
    const endDate = new Date(END_DATE);

    if (eventDate < startDate || eventDate > endDate) {
      errors.push(`Event ${index}: Outside date range (${eventDate.toISOString()})`);
    }
  });

  return errors;
}

/**
 * Main preparation function
 */
async function main() {
  console.log('=== Google Calendar Import Preparation ===\n');

  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Authenticate
    console.log('Step 1: Authenticating with Google Calendar API...');
    const auth = await authenticate();

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch all events
    console.log('\nStep 2: Fetching all events...');
    const rawEvents = await fetchAllEvents(calendar);

    // Transform events
    console.log('\nStep 3: Transforming events to Memory Shack format...');
    const cachedEvents = rawEvents
      .map(transformEvent)
      .filter((e): e is CachedEvent => e !== null);

    console.log(`Transformed ${cachedEvents.length} valid events`);

    // Extract unique attendees
    console.log('\nStep 4: Extracting unique attendees...');
    const uniqueAttendees = extractUniqueAttendees(cachedEvents);
    console.log(`Found ${uniqueAttendees.length} unique attendees`);

    // Validate data
    console.log('\nStep 5: Validating cached data...');
    const validationErrors = validateCachedData(cachedEvents);

    if (validationErrors.length > 0) {
      console.warn(`\nValidation warnings (${validationErrors.length}):`);
      validationErrors.slice(0, 10).forEach(err => console.warn(`  - ${err}`));
      if (validationErrors.length > 10) {
        console.warn(`  ... and ${validationErrors.length - 10} more`);
      }
    }

    // Save cache file
    console.log('\nStep 6: Saving cache file...');
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedEvents, null, 2));
    console.log(`Cache saved to ${CACHE_FILE}`);

    // Create import plan
    console.log('\nStep 7: Creating import plan...');
    const plan: ImportPlan = {
      ready: validationErrors.length === 0,
      totalEvents: cachedEvents.length,
      dateRange: {
        start: START_DATE,
        end: END_DATE,
      },
      uniqueAttendees,
      cacheFile: 'data/calendar-cache.json',
      errors: validationErrors,
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
    console.log(`Import plan saved to ${PLAN_FILE}`);

    // Summary
    console.log('\n=== Preparation Complete ===');
    console.log(`Total events fetched: ${plan.totalEvents}`);
    console.log(`Date range: ${START_DATE} to ${END_DATE}`);
    console.log(`Unique attendees: ${plan.uniqueAttendees.length}`);
    console.log(`Validation errors: ${validationErrors.length}`);
    console.log(`Ready for import: ${plan.ready ? 'YES' : 'NO'}`);

    if (plan.ready) {
      console.log('\nNext step: Run sequential import script to write events to database');
    } else {
      console.log('\nPlease fix validation errors before proceeding');
    }

  } catch (error) {
    console.error('\nError during preparation:', error);

    // Create error plan
    const errorPlan: ImportPlan = {
      ready: false,
      totalEvents: 0,
      dateRange: { start: START_DATE, end: END_DATE },
      uniqueAttendees: [],
      cacheFile: 'data/calendar-cache.json',
      errors: [error instanceof Error ? error.message : String(error)],
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(PLAN_FILE, JSON.stringify(errorPlan, null, 2));
    console.log(`Error plan saved to ${PLAN_FILE}`);

    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
