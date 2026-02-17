import { getDB } from './src/storage/db.js';

const db = getDB();

// Get Spotify stats
const spotifyStats = db.prepare(`
  SELECT
    COUNT(*) as total_plays,
    MIN(date) as first_play,
    MAX(date) as last_play,
    COUNT(DISTINCT json_extract(metadata, '$.artist_name')) as unique_artists,
    COUNT(DISTINCT json_extract(metadata, '$.album_name')) as unique_albums,
    ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as total_hours
  FROM timeline_events
  WHERE type = 'spotify_play'
`).get() as any;

console.log('=== Spotify Import Verification ===\n');
console.log('Database Statistics:');
console.log(`  Total plays: ${spotifyStats.total_plays.toLocaleString()}`);
console.log(`  Date range: ${spotifyStats.first_play} to ${spotifyStats.last_play}`);
console.log(`  Unique artists: ${spotifyStats.unique_artists.toLocaleString()}`);
console.log(`  Unique albums: ${spotifyStats.unique_albums.toLocaleString()}`);
console.log(`  Total listening time: ${spotifyStats.total_hours.toLocaleString()} hours`);

// Get top 10 artists
const topArtists = db.prepare(`
  SELECT
    json_extract(metadata, '$.artist_name') as artist,
    COUNT(*) as plays,
    ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as hours
  FROM timeline_events
  WHERE type = 'spotify_play'
  GROUP BY artist
  ORDER BY plays DESC
  LIMIT 10
`).all() as any[];

console.log('\nTop 10 Artists:');
topArtists.forEach((artist, index) => {
  console.log(`  ${index + 1}. ${artist.artist}: ${artist.plays.toLocaleString()} plays, ${artist.hours} hours`);
});

// Get listening by year
const byYear = db.prepare(`
  SELECT
    strftime('%Y', date) as year,
    COUNT(*) as plays,
    ROUND(SUM(json_extract(metadata, '$.duration_ms')) / 3600000.0, 2) as hours
  FROM timeline_events
  WHERE type = 'spotify_play'
  GROUP BY year
  ORDER BY year ASC
`).all() as any[];

console.log('\nListening by Year:');
byYear.forEach(row => {
  console.log(`  ${row.year}: ${row.plays.toLocaleString()} plays, ${row.hours} hours`);
});

// Check for duplicates
const duplicates = db.prepare(`
  SELECT
    json_extract(metadata, '$.played_at') as played_at,
    json_extract(metadata, '$.track_name') as track,
    COUNT(*) as count
  FROM timeline_events
  WHERE type = 'spotify_play'
  GROUP BY played_at, track
  HAVING count > 1
  LIMIT 10
`).all() as any[];

if (duplicates.length > 0) {
  console.log('\n⚠️  Duplicate plays detected:');
  duplicates.forEach(dup => {
    console.log(`  ${dup.played_at} - ${dup.track}: ${dup.count} duplicates`);
  });
} else {
  console.log('\n✓ No duplicate plays detected');
}

// Artist entities
const artistCount = db.prepare(`
  SELECT COUNT(*) as count
  FROM entities
  WHERE type = 'person' AND json_extract(properties, '$.role') = 'artist'
`).get() as { count: number };

console.log(`\n✓ Artist entities: ${artistCount.count.toLocaleString()}`);
