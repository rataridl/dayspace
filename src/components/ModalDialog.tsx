import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function ModalDialog({
  isOpen,
  title,
  description,
  onClose,
  children,
}: ModalDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C241E]/35 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dayspace-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E1D8] shadow-[0_20px_50px_rgba(28,36,30,0.12)] overflow-hidden transition-all duration-150">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-[#EFECE4]">
          <div>
            <h2
              id="dayspace-modal-title"
              className="font-serif text-xl font-medium text-[#1C241E]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#58645B]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#58645B] hover:bg-[#F3EFE6] hover:text-[#1C241E] focus-visible:outline-2 focus-visible:outline-[#1E3F31] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
