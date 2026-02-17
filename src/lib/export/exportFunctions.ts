/**
 * Export Functions
 *
 * Utilities for exporting timeline events and KV memories to various formats
 */

import type { TimelineEvent, KVMemory } from '@/types/memory';

/**
 * Download a file to the user's computer
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format timestamp as readable date string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Escape CSV value (handle quotes, commas, newlines)
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// ============================================================================
// Timeline Event Exports
// ============================================================================

/**
 * Export timeline events to CSV
 */
export function exportTimelineToCSV(events: TimelineEvent[], filename?: string): void {
  const headers = ['ID', 'Date', 'Timestamp', 'Type', 'Title', 'Namespace', 'Metadata', 'Created At', 'Updated At'];

  const rows = events.map((event) => [
    escapeCSV(event.id),
    escapeCSV(event.date),
    escapeCSV(formatTimestamp(event.timestamp)),
    escapeCSV(event.type),
    escapeCSV(event.title || ''),
    escapeCSV(event.namespace || ''),
    escapeCSV(event.metadata ? JSON.stringify(event.metadata) : ''),
    escapeCSV(formatTimestamp(event.created_at)),
    escapeCSV(formatTimestamp(event.updated_at)),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const defaultFilename = `timeline-export-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename || defaultFilename, 'text/csv');
}

/**
 * Export timeline events to JSON
 */
export function exportTimelineToJSON(events: TimelineEvent[], filename?: string): void {
  const data = {
    exported_at: new Date().toISOString(),
    count: events.length,
    events: events.map((event) => ({
      ...event,
      timestamp: formatTimestamp(event.timestamp),
      created_at: formatTimestamp(event.created_at),
      updated_at: formatTimestamp(event.updated_at),
    })),
  };

  const json = JSON.stringify(data, null, 2);

  const defaultFilename = `timeline-export-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename || defaultFilename, 'application/json');
}

/**
 * Copy timeline events to clipboard (tab-separated values)
 */
export async function copyTimelineToClipboard(events: TimelineEvent[]): Promise<void> {
  const headers = ['ID', 'Date', 'Timestamp', 'Type', 'Title', 'Namespace'];

  const rows = events.map((event) => [
    event.id,
    event.date,
    formatTimestamp(event.timestamp),
    event.type,
    event.title || '',
    event.namespace || '',
  ]);

  const tsv = [headers, ...rows].map((row) => row.join('\t')).join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw new Error('Failed to copy to clipboard');
  }
}

// ============================================================================
// KV Memory Exports
// ============================================================================

/**
 * Export KV memories to CSV
 */
export function exportKVToCSV(memories: KVMemory[], filename?: string): void {
  const headers = ['Key', 'Value', 'Namespace', 'Created At', 'Updated At', 'Expires At'];

  const rows = memories.map((memory) => [
    escapeCSV(memory.key),
    escapeCSV(typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value)),
    escapeCSV(memory.namespace || ''),
    escapeCSV(formatTimestamp(memory.created_at)),
    escapeCSV(formatTimestamp(memory.updated_at)),
    escapeCSV(memory.expires_at ? formatTimestamp(memory.expires_at) : ''),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const defaultFilename = `kv-export-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename || defaultFilename, 'text/csv');
}

/**
 * Export KV memories to JSON
 */
export function exportKVToJSON(memories: KVMemory[], filename?: string): void {
  const data = {
    exported_at: new Date().toISOString(),
    count: memories.length,
    memories: memories.map((memory) => ({
      ...memory,
      created_at: formatTimestamp(memory.created_at),
      updated_at: formatTimestamp(memory.updated_at),
      expires_at: memory.expires_at ? formatTimestamp(memory.expires_at) : null,
    })),
  };

  const json = JSON.stringify(data, null, 2);

  const defaultFilename = `kv-export-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename || defaultFilename, 'application/json');
}

/**
 * Copy KV memories to clipboard (tab-separated values)
 */
export async function copyKVToClipboard(memories: KVMemory[]): Promise<void> {
  const headers = ['Key', 'Value', 'Namespace'];

  const rows = memories.map((memory) => [
    memory.key,
    typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value),
    memory.namespace || '',
  ]);

  const tsv = [headers, ...rows].map((row) => row.join('\t')).join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw new Error('Failed to copy to clipboard');
  }
}

// ============================================================================
// Generic Export Functions
// ============================================================================

/**
 * Export data to CSV (auto-detects type)
 */
export function exportToCSV(
  data: TimelineEvent[] | KVMemory[],
  type: 'timeline' | 'kv',
  filename?: string
): void {
  if (type === 'timeline') {
    exportTimelineToCSV(data as TimelineEvent[], filename);
  } else {
    exportKVToCSV(data as KVMemory[], filename);
  }
}

/**
 * Export data to JSON (auto-detects type)
 */
export function exportToJSON(
  data: TimelineEvent[] | KVMemory[],
  type: 'timeline' | 'kv',
  filename?: string
): void {
  if (type === 'timeline') {
    exportTimelineToJSON(data as TimelineEvent[], filename);
  } else {
    exportKVToJSON(data as KVMemory[], filename);
  }
}

/**
 * Copy data to clipboard (auto-detects type)
 */
export async function copyToClipboard(
  data: TimelineEvent[] | KVMemory[],
  type: 'timeline' | 'kv'
): Promise<void> {
  if (type === 'timeline') {
    await copyTimelineToClipboard(data as TimelineEvent[]);
  } else {
    await copyKVToClipboard(data as KVMemory[]);
  }
}
