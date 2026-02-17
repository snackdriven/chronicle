import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TimelineEventFormData } from '../../../lib/validation/memorySchemas';
import { timelineEventSchema, EVENT_TYPES } from '../../../lib/validation/memorySchemas';
import { JSONEditor, objectToJSON, jsonToObject } from './JSONEditor';

interface TimelineEventFormProps {
  initialData?: Partial<TimelineEventFormData>;
  onSubmit: (data: TimelineEventFormData) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

/**
 * TimelineEventForm - React Hook Form with Zod validation
 *
 * Features:
 * - Type (select dropdown)
 * - Timestamp (datetime-local input)
 * - Title (text input, optional)
 * - Namespace (text input, optional)
 * - JSON metadata editor
 * - Create vs Edit modes
 * - Validation errors display
 * - Submit disabled during save
 *
 * @example
 * <TimelineEventForm
 *   mode="create"
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */
export function TimelineEventForm({
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
}: TimelineEventFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TimelineEventFormData>({
    resolver: zodResolver(timelineEventSchema),
    defaultValues: {
      type: initialData?.type || 'jira_ticket',
      timestamp: initialData?.timestamp
        ? new Date(initialData.timestamp).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      title: initialData?.title || '',
      namespace: initialData?.namespace || '',
      metadata: initialData?.metadata || {},
    },
  });

  const handleFormSubmit = async (data: TimelineEventFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Event Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Event Type
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="type"
          {...register('type')}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
            errors.type ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
        >
          {EVENT_TYPES.map((eventType) => (
            <option key={eventType.value} value={eventType.value}>
              {eventType.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      {/* Timestamp */}
      <div>
        <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700">
          Timestamp
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="timestamp"
          type="datetime-local"
          {...register('timestamp')}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
            errors.timestamp ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.timestamp && (
          <p className="mt-1 text-sm text-red-600">{errors.timestamp.message}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
          <span className="text-gray-400 ml-1">(optional)</span>
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          placeholder="Brief description of the event"
          maxLength={200}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
            errors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Namespace */}
      <div>
        <label htmlFor="namespace" className="block text-sm font-medium text-gray-700">
          Namespace
          <span className="text-gray-400 ml-1">(optional)</span>
        </label>
        <input
          id="namespace"
          type="text"
          {...register('namespace')}
          placeholder="e.g., work, personal, project-name"
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
            errors.namespace ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.namespace && (
          <p className="mt-1 text-sm text-red-600">{errors.namespace.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Lowercase letters, numbers, hyphens, and underscores only
        </p>
      </div>

      {/* Metadata JSON Editor */}
      <Controller
        name="metadata"
        control={control}
        render={({ field }) => (
          <JSONEditor
            label="Metadata"
            value={objectToJSON(field.value)}
            onChange={(jsonString) => {
              const parsed = jsonToObject(jsonString);
              field.onChange(parsed);
            }}
            error={errors.metadata?.message as string | undefined}
            height={200}
          />
        )}
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Update Event'}
        </button>
      </div>
    </form>
  );
}
