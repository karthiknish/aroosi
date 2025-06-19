import { Platform, StatusBar } from 'react-native';
import { Colors } from './Colors';
import { Layout } from './Layout';

export const PlatformConstants = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  
  // Platform-specific measurements
  statusBarHeight: Platform.select({
    ios: 44, // Standard iOS status bar
    android: StatusBar.currentHeight || 24,
  }),
  
  // Safe area adjustments
  safeAreaTop: Platform.select({
    ios: 44,
    android: 0,
  }),
  
  // Navigation patterns
  navigation: {
    headerHeight: Platform.select({
      ios: 44,
      android: 56,
    }),
    tabBarHeight: Platform.select({
      ios: 83,
      android: 60,
    }),
  },
};

// Platform-specific design tokens
export const PlatformDesign = {
  // Typography scaling
  typography: {
    scale: Platform.select({
      ios: 1.0,
      android: 0.95, // Slightly smaller on Android
    }),
    
    // Font weights (different between platforms)
    fontWeight: {
      regular: Platform.select({
        ios: '400',
        android: 'normal',
      }),
      medium: Platform.select({
        ios: '500',
        android: '500',
      }),
      semibold: Platform.select({
        ios: '600',
        android: 'bold',
      }),
      bold: Platform.select({
        ios: '700',
        android: 'bold',
      }),
    },
  },
  
  // Shadows and elevation
  shadows: {
    small: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
    
    medium: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
    
    large: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  // Border radius preferences
  radius: {
    button: Platform.select({
      ios: Layout.radius.lg,
      android: Layout.radius.md,
    }),
    
    card: Platform.select({
      ios: Layout.radius.xl,
      android: Layout.radius.lg,
    }),
    
    modal: Platform.select({
      ios: Layout.radius.xl,
      android: Layout.radius.lg,
    }),
  },
  
  // Animation durations
  animation: {
    short: Platform.select({
      ios: 200,
      android: 150,
    }),
    
    medium: Platform.select({
      ios: 300,
      android: 250,
    }),
    
    long: Platform.select({
      ios: 500,
      android: 400,
    }),
  },
  
  // Button styles
  button: {
    height: Platform.select({
      ios: 50,
      android: 48,
    }),
    
    padding: Platform.select({
      ios: {
        horizontal: Layout.spacing.lg,
        vertical: Layout.spacing.md,
      },
      android: {
        horizontal: Layout.spacing.md,
        vertical: Layout.spacing.sm,
      },
    }),
  },
  
  // Input field styles
  input: {
    height: Platform.select({
      ios: 44,
      android: 48,
    }),
    
    borderWidth: Platform.select({
      ios: 1,
      android: 2,
    }),
  },
  
  // Colors with platform variations
  colors: {
    primary: Platform.select({
      ios: Colors.primary[500],
      android: Colors.primary[600], // Slightly darker on Android
    }),
    
    background: Platform.select({
      ios: Colors.background.primary,
      android: '#FAFAFA', // Material Design background
    }),
    
    surface: Platform.select({
      ios: Colors.background.primary,
      android: '#FFFFFF',
    }),
    
    divider: Platform.select({
      ios: Colors.border.primary,
      android: '#E0E0E0', // Material divider color
    }),
  },
};

// Platform-specific interaction patterns
export const PlatformInteraction = {
  // Touch feedback
  touchFeedback: Platform.select({
    ios: 'opacity', // iOS uses opacity changes
    android: 'ripple', // Android uses ripple effect
  }),
  
  // Haptic feedback types
  haptic: {
    light: Platform.select({
      ios: 'light',
      android: 'light',
    }),
    
    medium: Platform.select({
      ios: 'medium',
      android: 'medium',
    }),
    
    heavy: Platform.select({
      ios: 'heavy',
      android: 'heavy',
    }),
    
    selection: Platform.select({
      ios: 'selection',
      android: 'clock', // Android equivalent
    }),
  },
  
  // Keyboard behavior
  keyboard: {
    behavior: Platform.select({
      ios: 'padding',
      android: 'height',
    }),
    
    avoidingView: Platform.select({
      ios: true,
      android: false, // Android handles this differently
    }),
  },
};

// Navigation patterns
export const PlatformNavigation = {
  // Header styles
  header: {
    backgroundColor: Platform.select({
      ios: Colors.background.primary,
      android: Colors.primary[500],
    }),
    
    titleColor: Platform.select({
      ios: Colors.text.primary,
      android: '#FFFFFF',
    }),
    
    buttonColor: Platform.select({
      ios: Colors.primary[500],
      android: '#FFFFFF',
    }),
    
    elevation: Platform.select({
      ios: 0,
      android: 4,
    }),
  },
  
  // Tab bar styles
  tabBar: {
    backgroundColor: Platform.select({
      ios: Colors.background.primary,
      android: Colors.background.primary,
    }),
    
    activeColor: Platform.select({
      ios: Colors.primary[500],
      android: Colors.primary[600],
    }),
    
    inactiveColor: Platform.select({
      ios: Colors.neutral[400],
      android: Colors.neutral[500],
    }),
    
    labelStyle: Platform.select({
      ios: {
        fontSize: 10,
        fontWeight: '500',
      },
      android: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
      },
    }),
  },
};

// Utility functions
export const PlatformUtils = {
  // Get platform-specific styles
  getStyle: (iosStyle: any, androidStyle: any) => {
    return Platform.select({
      ios: iosStyle,
      android: androidStyle,
    });
  },
  
  // Check if running on specific platform
  isIOS: () => Platform.OS === 'ios',
  isAndroid: () => Platform.OS === 'android',
  
  // Get platform-specific values
  getValue: <T>(iosValue: T, androidValue: T): T => {
    return Platform.select({
      ios: iosValue,
      android: androidValue,
    }) as T;
  },
  
  // Apply platform-specific animations
  getAnimation: (type: 'short' | 'medium' | 'long') => {
    return PlatformDesign.animation[type];
  },
};
