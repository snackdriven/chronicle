import type { CellContext } from '@tanstack/react-table';

interface BadgeCellProps<TData> extends CellContext<TData, unknown> {}

/**
 * BadgeCell - Type-based badge with color mapping
 *
 * Event type color mapping:
 * - jira_ticket: blue
 * - spotify_play: green
 * - calendar_event: purple
 * - journal_entry: yellow
 * - github_commit: gray
 * - unknown: red (for invalid/unexpected types)
 *
 * Security:
 * - Uses whitelist approach for allowed event types
 * - Validates input to prevent XSS attacks
 * - Shows "Unknown" badge for invalid types
 *
 * Usage:
 * {
 *   accessorKey: 'eventType',
 *   cell: (props) => <BadgeCell {...props} />
 * }
 */
export function BadgeCell<TData>({ getValue }: BadgeCellProps<TData>) {
  const rawEventType = getValue();

  // Whitelist of allowed event types (security: prevent XSS)
  const allowedTypes = [
    'jira_ticket',
    'spotify_play',
    'calendar_event',
    'journal_entry',
    'github_commit',
  ] as const;

  type AllowedEventType = typeof allowedTypes[number];

  // Validate and sanitize event type
  const isValidType = (type: string): type is AllowedEventType => {
    return allowedTypes.includes(type as AllowedEventType);
  };

  const eventType: AllowedEventType | 'unknown' =
    typeof rawEventType === 'string' && isValidType(rawEventType)
      ? rawEventType
      : 'unknown';

  const colorMap: Record<AllowedEventType | 'unknown', string> = {
    jira_ticket: 'bg-blue-100 text-blue-800 border-blue-200',
    spotify_play: 'bg-green-100 text-green-800 border-green-200',
    calendar_event: 'bg-purple-100 text-purple-800 border-purple-200',
    journal_entry: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    github_commit: 'bg-gray-100 text-gray-800 border-gray-200',
    unknown: 'bg-red-100 text-red-800 border-red-200',
  };

  const displayTextMap: Record<AllowedEventType | 'unknown', string> = {
    jira_ticket: 'Jira Ticket',
    spotify_play: 'Spotify Play',
    calendar_event: 'Calendar Event',
    journal_entry: 'Journal Entry',
    github_commit: 'GitHub Commit',
    unknown: 'Unknown',
  };

  const colorClass = colorMap[eventType];
  const displayText = displayTextMap[eventType];

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full
        text-xs font-medium border
        ${colorClass}
      `}
      title={eventType === 'unknown' ? `Invalid type: ${String(rawEventType)}` : undefined}
    >
      {displayText}
    </span>
  );
}
