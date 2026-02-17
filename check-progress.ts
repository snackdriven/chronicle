import { getDB } from './src/storage/db.js';

const db = getDB();

const spotify = db.prepare("SELECT COUNT(*) as count FROM timeline_events WHERE type='spotify_play'").get() as { count: number };
const jira = db.prepare("SELECT COUNT(*) as count FROM timeline_events WHERE type='jira_ticket'").get() as { count: number };
const total = db.prepare("SELECT COUNT(*) as count FROM timeline_events").get() as { count: number };
const artists = db.prepare("SELECT COUNT(*) as count FROM entities WHERE type='person' AND json_extract(properties, '$.role')='artist'").get() as { count: number };

console.log('Current database counts:');
console.log(`  Spotify plays: ${spotify.count.toLocaleString()}`);
console.log(`  JIRA tickets: ${jira.count.toLocaleString()}`);
console.log(`  Total events: ${total.count.toLocaleString()}`);
console.log(`  Artist entities: ${artists.count.toLocaleString()}`);
