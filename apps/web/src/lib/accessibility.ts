/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

// Screen reader announcement utility
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus management utilities
export const trapFocus = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleTabKey);
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

// Skip link utilities
export const skipToContent = () => {
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.focus();
    mainContent.scrollIntoView();
  }
};

// Color contrast validation
export const hasValidContrast = (foreground: string, background: string): boolean => {
  // Simplified contrast check - in production, use a proper contrast library
  const getLuminance = (color: string): number => {
    // Convert hex to RGB and calculate luminance
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return ratio >= 4.5; // WCAG AA standard
};

// Keyboard navigation helpers
export const handleKeyboardNavigation = (
  event: KeyboardEvent,
  onEnter?: () => void,
  onSpace?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) => {
  switch (event.key) {
    case 'Enter':
      if (onEnter) {
        event.preventDefault();
        onEnter();
      }
      break;
    case ' ':
    case 'Space':
      if (onSpace) {
        event.preventDefault();
        onSpace();
      }
      break;
    case 'Escape':
      if (onEscape) {
        event.preventDefault();
        onEscape();
      }
      break;
    case 'ArrowUp':
      if (onArrowKeys) {
        event.preventDefault();
        onArrowKeys('up');
      }
      break;
    case 'ArrowDown':
      if (onArrowKeys) {
        event.preventDefault();
        onArrowKeys('down');
      }
      break;
    case 'ArrowLeft':
      if (onArrowKeys) {
        event.preventDefault();
        onArrowKeys('left');
      }
      break;
    case 'ArrowRight':
      if (onArrowKeys) {
        event.preventDefault();
        onArrowKeys('right');
      }
      break;
  }
};

// Form validation helpers
export const getAriaDescribedBy = (
  fieldName: string,
  hasError?: boolean,
  hasHelp?: boolean
): string => {
  const ids = [];
  if (hasError) ids.push(`${fieldName}-error`);
  if (hasHelp) ids.push(`${fieldName}-help`);
  return ids.join(' ');
};

// ARIA label generators
export const generateAriaLabel = (
  action: string,
  target: string,
  context?: string
): string => {
  return context ? `${action} ${target} ${context}` : `${action} ${target}`;
};