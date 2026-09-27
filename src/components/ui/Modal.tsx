import { useEffect, useRef, useId } from 'react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/useFocusTrap'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}

export default function Modal({ isOpen, onClose, title, children, className, ariaLabel }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  
  // Use focus trap hook
  useFocusTrap(modalRef, isOpen)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg mx-4 sm:mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
          className
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b bg-white dark:bg-gray-800">
            <h2 id={titleId} className="text-lg sm:text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="閉じる"
              type="button"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}