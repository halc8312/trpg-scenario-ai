import { useEffect, RefObject } from 'react'

/**
 * Custom hook that implements focus trap functionality for modals and dialogs
 * Keeps focus within the specified element when tabbing
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return

    const element = ref.current
    if (!element) return

    // Find all focusable elements within the container
    const getFocusableElements = () => {
      return element.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    }

    // Focus the first focusable element when the trap is activated
    const focusableElements = getFocusableElements()
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Store the previously focused element to restore focus later
    const previouslyFocusedElement = document.activeElement as HTMLElement

    // Focus the first element or the container itself if no focusable elements
    if (firstElement) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => firstElement.focus(), 50)
    } else {
      element.focus()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (!firstElement || !lastElement) return

      // If shift+tab on first element, focus last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // If tab on last element, focus first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    // Add event listener
    element.addEventListener('keydown', handleTab)

    // Cleanup function
    return () => {
      element.removeEventListener('keydown', handleTab)
      // Restore focus to the previously focused element
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus()
      }
    }
  }, [ref, isActive])
}