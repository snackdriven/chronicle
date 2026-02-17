import Editor from '@monaco-editor/react';
import { useState, useEffect } from 'react';
import { validateJSON } from '../../../lib/validation/memorySchemas';

interface JSONEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  error?: string;
  label?: string;
  required?: boolean;
}

/**
 * JSONEditor - Monaco Editor with JSON syntax highlighting and validation
 *
 * Features:
 * - JSON syntax highlighting
 * - Real-time validation
 * - Error messages below editor
 * - Configurable height (default 200px)
 * - Auto-formatting
 *
 * @example
 * <JSONEditor
 *   value={jsonString}
 *   onChange={setJsonString}
 *   label="Metadata"
 *   height={300}
 * />
 */
export function JSONEditor({
  value,
  onChange,
  height = 200,
  error,
  label,
  required = false,
}: JSONEditorProps) {
  const [validationError, setValidationError] = useState<string | undefined>();
  const [editorValue, setEditorValue] = useState(value);

  // Validate JSON on change
  useEffect(() => {
    if (!editorValue.trim()) {
      setValidationError(undefined);
      return;
    }

    const { valid, error: validationErr } = validateJSON(editorValue);
    setValidationError(valid ? undefined : validationErr);
  }, [editorValue]);

  const handleEditorChange = (newValue: string | undefined) => {
    const val = newValue ?? '';
    setEditorValue(val);
    onChange(val);
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className={`overflow-hidden rounded-md border ${
          displayError ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <Editor
          height={height}
          defaultLanguage="json"
          value={editorValue}
          onChange={handleEditorChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            folding: true,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
      {displayError && (
        <p className="text-sm text-red-600 mt-1">{displayError}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        Enter valid JSON. Use Ctrl+Space for autocomplete.
      </p>
    </div>
  );
}

/**
 * Helper to format object as JSON string
 */
export function objectToJSON(obj: any): string {
  if (obj === null || obj === undefined) {
    return '';
  }
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '';
  }
}

/**
 * Helper to parse JSON string to object
 */
export function jsonToObject(json: string): any {
  if (!json.trim()) {
    return undefined;
  }
  const { valid, parsed } = validateJSON(json);
  return valid ? parsed : undefined;
}
