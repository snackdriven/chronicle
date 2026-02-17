import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * ConfirmDialog - Reusable confirmation dialog component
 *
 * Features:
 * - Beautiful modal UI using Headless UI
 * - Animated transitions
 * - Configurable variants (danger, warning, info)
 * - Loading state support
 * - Keyboard navigation (Escape to cancel)
 * - Focus trap for accessibility
 *
 * Usage:
 * <ConfirmDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Event"
 *   description="Are you sure you want to delete this event? This action cannot be undone."
 *   variant="danger"
 * />
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: <Trash2 className="w-6 h-6" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      buttonDisabled: 'bg-red-400',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      buttonDisabled: 'bg-yellow-400',
    },
    info: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      buttonDisabled: 'bg-blue-400',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isLoading ? () => {} : onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* Dialog container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 rounded-full p-3 ${styles.iconBg} ${styles.iconColor}`}>
                    {styles.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 mb-2"
                    >
                      {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 mb-6">
                      {description}
                    </Dialog.Description>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {cancelLabel}
                      </button>
                      <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`
                          px-4 py-2 text-sm font-medium text-white rounded-md
                          focus:outline-none focus:ring-2 focus:ring-offset-2
                          disabled:cursor-not-allowed transition-colors
                          inline-flex items-center gap-2
                          ${isLoading ? styles.buttonDisabled : styles.buttonBg}
                        `}
                      >
                        {isLoading && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {confirmLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
