import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { KVMemoryFormData } from '../../../lib/validation/memorySchemas';
import { kvMemorySchema, TTL_UNITS, convertTTLToSeconds } from '../../../lib/validation/memorySchemas';
import { JSONEditor, objectToJSON, jsonToObject } from './JSONEditor';

interface KVMemoryFormProps {
  initialData?: Partial<KVMemoryFormData>;
  onSubmit: (data: KVMemoryFormData) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

/**
 * KVMemoryForm - React Hook Form for Key-Value Memories
 *
 * Features:
 * - Key (text input, validated)
 * - Value (JSON editor)
 * - Namespace (text input, optional)
 * - TTL (number + unit selector)
 * - TTL unit conversion (seconds, minutes, hours, days)
 * - JSON value validation
 * - Create vs Edit modes
 * - Validation errors display
 * - Submit disabled during save
 *
 * @example
 * <KVMemoryForm
 *   mode="create"
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */
export function KVMemoryForm({
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
}: KVMemoryFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<KVMemoryFormData>({
    resolver: zodResolver(kvMemorySchema),
    defaultValues: {
      key: initialData?.key || '',
      value: initialData?.value || {},
      namespace: initialData?.namespace || '',
      ttl: initialData?.ttl || undefined,
      ttlUnit: initialData?.ttlUnit || 'seconds',
    },
  });

  const ttlValue = watch('ttl');

  const handleFormSubmit = async (data: KVMemoryFormData) => {
    try {
      // Convert TTL to seconds if both ttl and ttlUnit are provided
      const submitData: KVMemoryFormData = { ...data };
      if (submitData.ttl && submitData.ttlUnit) {
        submitData.ttl = convertTTLToSeconds(submitData.ttl, submitData.ttlUnit);
        delete submitData.ttlUnit; // Remove ttlUnit as backend expects ttl in seconds
      }
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Key */}
      <div>
        <label htmlFor="key" className="block text-sm font-medium text-gray-700">
          Key
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="key"
          type="text"
          {...register('key')}
          placeholder="e.g., user.preferences, config.theme"
          maxLength={100}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
            errors.key ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.key && (
          <p className="mt-1 text-sm text-red-600">{errors.key.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Letters, numbers, dots, hyphens, and underscores only
        </p>
      </div>

      {/* Value (JSON Editor) */}
      <Controller
        name="value"
        control={control}
        render={({ field }) => (
          <JSONEditor
            label="Value"
            required
            value={objectToJSON(field.value)}
            onChange={(jsonString) => {
              const parsed = jsonToObject(jsonString);
              field.onChange(parsed);
            }}
            error={errors.value?.message as string | undefined}
            height={250}
          />
        )}
      />

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

      {/* TTL (Time To Live) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Time to Live (TTL)
          <span className="text-gray-400 ml-1">(optional)</span>
        </label>
        <div className="mt-1 flex space-x-2">
          <div className="flex-1">
            <input
              id="ttl"
              type="number"
              {...register('ttl', { valueAsNumber: true })}
              placeholder="e.g., 30"
              min={1}
              step={1}
              className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                errors.ttl ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
          </div>
          <div className="w-32">
            <select
              id="ttlUnit"
              {...register('ttlUnit')}
              disabled={!ttlValue}
              className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                !ttlValue ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'
              }`}
            >
              {TTL_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {errors.ttl && (
          <p className="mt-1 text-sm text-red-600">{errors.ttl.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Memory will be automatically deleted after this duration
        </p>
      </div>

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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Memory' : 'Update Memory'}
        </button>
      </div>
    </form>
  );
}
