import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB, closeDB } from '../../src/storage/db.js';
import {
  storeTimelineEvent,
  getTimeline,
  getEvent,
  getTimelineRange,
  deleteEvent,
  updateEvent,
  getEventTypes,
  getTimelineSummary,
} from '../../src/storage/timeline.js';
import { NotFoundError, ValidationError } from '../../src/types.js';

beforeEach(() => {
  closeDB();
  initDB();
});

afterEach(() => {
  closeDB();
});

const DAY = '2025-06-15';
const TS = new Date(`${DAY}T10:00:00Z`).getTime();

describe('storeTimelineEvent + getTimeline', () => {
  it('stores an event and retrieves it on the correct date', () => {
    const id = storeTimelineEvent({ type: 'journal_entry', timestamp: TS, title: 'morning note' });
    const { events } = getTimeline({ date: DAY });
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(id);
    expect(events[0].title).toBe('morning note');
  });

  it('returns empty results (not an error) for a date with no events', () => {
    const { events, stats } = getTimeline({ date: '2020-01-01' });
    expect(events).toHaveLength(0);
    expect(stats.total).toBe(0);
  });

  it('round-trips metadata without corruption', () => {
    const meta = { url: 'https://example.com', tags: ['a', 'b'], count: 42 };
    const id = storeTimelineEvent({ type: 'github_commit', timestamp: TS, metadata: meta });
    expect(getEvent(id).metadata).toEqual(meta);
  });

  it('accepts an ISO string timestamp and stores as milliseconds', () => {
    const id = storeTimelineEvent({ type: 'calendar_event', timestamp: `${DAY}T10:00:00Z` });
    const event = getEvent(id);
    expect(event.timestamp).toBe(TS);
    expect(event.date).toBe(DAY);
  });

  it('returns events in ascending timestamp order', () => {
    const t1 = new Date(`${DAY}T08:00:00Z`).getTime();
    const t2 = new Date(`${DAY}T14:00:00Z`).getTime();
    const t3 = new Date(`${DAY}T11:00:00Z`).getTime();

    storeTimelineEvent({ type: 'journal_entry', timestamp: t1, title: 'early' });
    storeTimelineEvent({ type: 'journal_entry', timestamp: t2, title: 'late' });
    storeTimelineEvent({ type: 'journal_entry', timestamp: t3, title: 'mid' });

    const { events } = getTimeline({ date: DAY });
    expect(events.map(e => e.title)).toEqual(['early', 'mid', 'late']);
  });

  it('filters by type when provided', () => {
    storeTimelineEvent({ type: 'journal_entry', timestamp: TS });
    storeTimelineEvent({ type: 'github_commit', timestamp: TS });

    const { events } = getTimeline({ date: DAY, type: 'journal_entry' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('journal_entry');
  });
});

describe('validation', () => {
  it('throws ValidationError when type is missing', () => {
    expect(() => storeTimelineEvent({ type: '', timestamp: TS })).toThrow(ValidationError);
  });

  it('throws ValidationError for an unparseable timestamp string', () => {
    expect(() =>
      storeTimelineEvent({ type: 'journal_entry', timestamp: 'not-a-date' as any })
    ).toThrow(ValidationError);
  });

  it('throws ValidationError for an invalid date format in getTimeline', () => {
    expect(() => getTimeline({ date: '15-06-2025' })).toThrow(ValidationError);
  });

  it('throws ValidationError for an invalid date in getTimelineRange', () => {
    expect(() => getTimelineRange('bad', '2025-06-30')).toThrow(ValidationError);
  });
});

describe('getEvent', () => {
  it('returns a single event by ID', () => {
    const id = storeTimelineEvent({ type: 'jira_ticket', timestamp: TS, title: 'PROJ-42' });
    const event = getEvent(id);
    expect(event.id).toBe(id);
    expect(event.title).toBe('PROJ-42');
  });

  it('throws NotFoundError for an unknown ID', () => {
    expect(() => getEvent('00000000-0000-0000-0000-000000000000')).toThrow(NotFoundError);
  });
});

describe('getTimelineRange', () => {
  it('returns events across multiple days in order', () => {
    const d1 = '2025-06-10';
    const d2 = '2025-06-12';
    const d3 = '2025-06-15';

    storeTimelineEvent({ type: 'journal_entry', timestamp: new Date(`${d3}T10:00:00Z`).getTime() });
    storeTimelineEvent({ type: 'journal_entry', timestamp: new Date(`${d1}T09:00:00Z`).getTime() });
    storeTimelineEvent({ type: 'journal_entry', timestamp: new Date(`${d2}T08:00:00Z`).getTime() });

    const { events } = getTimelineRange('2025-06-01', '2025-06-30');
    expect(events).toHaveLength(3);
    expect(events[0].date).toBe(d1);
    expect(events[1].date).toBe(d2);
    expect(events[2].date).toBe(d3);
  });

  it('excludes events outside the range', () => {
    storeTimelineEvent({ type: 'journal_entry', timestamp: new Date('2025-01-01T00:00:00Z').getTime() });
    storeTimelineEvent({ type: 'journal_entry', timestamp: new Date(`${DAY}T10:00:00Z`).getTime() });

    const { events } = getTimelineRange('2025-06-01', '2025-06-30');
    expect(events).toHaveLength(1);
    expect(events[0].date).toBe(DAY);
  });
});

describe('deleteEvent', () => {
  it('removes an event so it no longer appears in queries', () => {
    const id = storeTimelineEvent({ type: 'journal_entry', timestamp: TS });
    deleteEvent(id);
    expect(getTimeline({ date: DAY }).events).toHaveLength(0);
    expect(() => getEvent(id)).toThrow(NotFoundError);
  });
});

describe('updateEvent', () => {
  it('updates the title and returns the updated event', () => {
    const id = storeTimelineEvent({ type: 'journal_entry', timestamp: TS, title: 'original' });
    const updated = updateEvent(id, { title: 'revised' });
    expect(updated.title).toBe('revised');
    expect(getEvent(id).title).toBe('revised');
  });

  it('updates metadata without affecting other fields', () => {
    const id = storeTimelineEvent({ type: 'github_commit', timestamp: TS, title: 'keep me' });
    updateEvent(id, { metadata: { sha: 'abc123' } });
    const event = getEvent(id);
    expect(event.metadata).toEqual({ sha: 'abc123' });
    expect(event.title).toBe('keep me');
  });

  it('throws NotFoundError for an unknown ID', () => {
    expect(() =>
      updateEvent('00000000-0000-0000-0000-000000000000', { title: 'x' })
    ).toThrow(NotFoundError);
  });
});

describe('getEventTypes', () => {
  it('returns counts keyed by type', () => {
    storeTimelineEvent({ type: 'journal_entry', timestamp: TS });
    storeTimelineEvent({ type: 'journal_entry', timestamp: TS });
    storeTimelineEvent({ type: 'github_commit', timestamp: TS });

    const types = getEventTypes();
    expect(types['journal_entry']).toBe(2);
    expect(types['github_commit']).toBe(1);
  });

});

describe('getTimelineSummary', () => {
  it('returns totals by type for a date without loading events', () => {
    storeTimelineEvent({ type: 'journal_entry', timestamp: TS });
    storeTimelineEvent({ type: 'journal_entry', timestamp: TS });
    storeTimelineEvent({ type: 'github_commit', timestamp: TS });

    const summary = getTimelineSummary(DAY);
    expect(summary.date).toBe(DAY);
    expect(summary.total).toBe(3);
    expect(summary.by_type['journal_entry']).toBe(2);
    expect(summary.by_type['github_commit']).toBe(1);
  });

});
