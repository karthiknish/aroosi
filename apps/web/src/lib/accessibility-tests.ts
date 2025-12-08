/**
 * Accessibility testing utilities for WCAG compliance
 */

// Color contrast testing
export function calculateContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export function testContrastCompliance(foreground: string, background: string): {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAA_Large: boolean;
  wcagAAA_Large: boolean;
} {
  const ratio = calculateContrastRatio(foreground, background);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    wcagAA: ratio >= 4.5,           // Normal text AA
    wcagAAA: ratio >= 7,            // Normal text AAA
    wcagAA_Large: ratio >= 3,       // Large text AA (18pt+/14pt+ bold)
    wcagAAA_Large: ratio >= 4.5,    // Large text AAA
  };
}

// Test form accessibility
export function testFormAccessibility(formElement: HTMLFormElement): {
  issues: string[];
  passed: boolean;
} {
  const issues: string[] = [];
  
  // Check for form labels
  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    
    if (!id) {
      issues.push(`Input missing ID attribute: ${input.tagName.toLowerCase()}`);
    } else {
      const label = formElement.querySelector(`label[for="${id}"]`);
      if (!label && !ariaLabel && !ariaLabelledBy) {
        issues.push(`Input "${id}" missing associated label`);
      }
    }
    
    // Check required fields
    if (input.hasAttribute('required') && !input.hasAttribute('aria-required')) {
      issues.push(`Required input "${id}" missing aria-required attribute`);
    }
    
    // Check error states
    if (input.getAttribute('aria-invalid') === 'true') {
      const describedBy = input.getAttribute('aria-describedby');
      if (!describedBy) {
        issues.push(`Invalid input "${id}" missing aria-describedby for error message`);
      } else {
        const errorElement = document.getElementById(describedBy);
        if (!errorElement) {
          issues.push(`Error element referenced by aria-describedby not found: ${describedBy}`);
        }
      }
    }
  });
  
  return {
    issues,
    passed: issues.length === 0
  };
}

// Test heading hierarchy
export function testHeadingHierarchy(container: HTMLElement = document.body): {
  issues: string[];
  hierarchy: { level: number; text: string }[];
  passed: boolean;
} {
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const hierarchy: { level: number; text: string }[] = [];
  const issues: string[] = [];
  
  let lastLevel = 0;
  
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent?.trim() || '';
    
    hierarchy.push({ level, text });
    
    if (index === 0 && level !== 1) {
      issues.push('Page should start with an h1 heading');
    }
    
    if (level > lastLevel + 1) {
      issues.push(`Heading level skipped: h${lastLevel} to h${level} (${text})`);
    }
    
    if (!text) {
      issues.push(`Empty heading found: ${heading.tagName.toLowerCase()}`);
    }
    
    lastLevel = level;
  });
  
  return {
    issues,
    hierarchy,
    passed: issues.length === 0
  };
}

// Test keyboard navigation
export function testKeyboardNavigation(container: HTMLElement = document.body): {
  focusableElements: number;
  tabIndexIssues: string[];
  passed: boolean;
} {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  const focusableElements = container.querySelectorAll(focusableSelectors);
  const tabIndexIssues: string[] = [];
  
  focusableElements.forEach((element) => {
    const tabIndex = element.getAttribute('tabindex');
    
    // Check for positive tab indices (anti-pattern)
    if (tabIndex && parseInt(tabIndex) > 0) {
      tabIndexIssues.push(`Positive tabindex found on ${element.tagName.toLowerCase()} - should use 0 or -1`);
    }
    
    // Check for missing focus indicators
    const computedStyle = window.getComputedStyle(element, ':focus-visible');
    if (!computedStyle.outline && !computedStyle.boxShadow && !computedStyle.border) {
      tabIndexIssues.push(`Element may be missing focus indicator: ${element.tagName.toLowerCase()}`);
    }
  });
  
  return {
    focusableElements: focusableElements.length,
    tabIndexIssues,
    passed: tabIndexIssues.length === 0
  };
}

// Test ARIA attributes
export function testAriaAttributes(container: HTMLElement = document.body): {
  issues: string[];
  passed: boolean;
} {
  const issues: string[] = [];
  
  // Check for aria-labelledby references
  const labelledByElements = container.querySelectorAll('[aria-labelledby]');
  labelledByElements.forEach((element) => {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const referencedElement = document.getElementById(labelledBy);
      if (!referencedElement) {
        issues.push(`aria-labelledby references non-existent element: ${labelledBy}`);
      }
    }
  });
  
  // Check for aria-describedby references
  const describedByElements = container.querySelectorAll('[aria-describedby]');
  describedByElements.forEach((element) => {
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const ids = describedBy.split(' ');
      ids.forEach((id) => {
        const referencedElement = document.getElementById(id);
        if (!referencedElement) {
          issues.push(`aria-describedby references non-existent element: ${id}`);
        }
      });
    }
  });
  
  // Check for required ARIA attributes on certain roles
  const roleElements = container.querySelectorAll('[role]');
  roleElements.forEach((element) => {
    const role = element.getAttribute('role');
    
    switch (role) {
      case 'button':
        if (!element.getAttribute('aria-label') && !element.textContent?.trim()) {
          issues.push('Button role element missing accessible name');
        }
        break;
      case 'img':
        if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
          issues.push('Image role element missing alt text');
        }
        break;
      case 'region':
      case 'banner':
      case 'main':
      case 'contentinfo':
        if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
          issues.push(`Landmark role "${role}" should have an accessible name`);
        }
        break;
    }
  });
  
  return {
    issues,
    passed: issues.length === 0
  };
}

// Run all accessibility tests
export function runAccessibilityAudit(container: HTMLElement = document.body): {
  form: ReturnType<typeof testFormAccessibility> | null;
  headings: ReturnType<typeof testHeadingHierarchy>;
  keyboard: ReturnType<typeof testKeyboardNavigation>;
  aria: ReturnType<typeof testAriaAttributes>;
  overallPassed: boolean;
  totalIssues: number;
} {
  const form = container.querySelector('form') 
    ? testFormAccessibility(container.querySelector('form')!)
    : null;
  
  const headings = testHeadingHierarchy(container);
  const keyboard = testKeyboardNavigation(container);
  const aria = testAriaAttributes(container);
  
  const totalIssues = (form?.issues.length || 0) + 
                     headings.issues.length + 
                     keyboard.tabIndexIssues.length + 
                     aria.issues.length;
  
  return {
    form,
    headings,
    keyboard,
    aria,
    overallPassed: totalIssues === 0,
    totalIssues
  };
}