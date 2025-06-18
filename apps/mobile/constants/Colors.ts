export const Colors = {
  // Primary brand colors
  primary: {
    50: '#fef3f2',
    100: '#fee4e2',
    200: '#fecdc9',
    300: '#fda29b',
    400: '#f97066',
    500: '#f04438', // Main brand color
    600: '#d92d20',
    700: '#b42318',
    800: '#912018',
    900: '#7a271a',
  },
  
  // Neutral colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },
  
  // Border colors
  border: {
    primary: '#e5e7eb',
    secondary: '#d1d5db',
    focus: '#f04438',
  },
  
  // Gradient colors
  gradient: {
    primary: ['#f04438', '#dc2626'],
    secondary: ['#fecdc9', '#fee4e2'],
  },
};

export const darkColors = {
  // Primary brand colors (same)
  primary: Colors.primary,
  
  // Dark neutral colors
  neutral: {
    50: '#111827',
    100: '#1f2937',
    200: '#374151',
    300: '#4b5563',
    400: '#6b7280',
    500: '#9ca3af',
    600: '#d1d5db',
    700: '#e5e7eb',
    800: '#f3f4f6',
    900: '#f9fafb',
  },
  
  // Success, warning, error (same)
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  
  // Dark background colors
  background: {
    primary: '#111827',
    secondary: '#1f2937',
    tertiary: '#374151',
  },
  
  // Dark text colors
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    tertiary: '#9ca3af',
    inverse: '#111827',
  },
  
  // Dark border colors
  border: {
    primary: '#374151',
    secondary: '#4b5563',
    focus: '#f04438',
  },
  
  // Gradient colors (same)
  gradient: Colors.gradient,
};