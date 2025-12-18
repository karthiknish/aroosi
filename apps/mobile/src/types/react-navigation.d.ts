/**
 * Type declarations to fix React Navigation 7.x compatibility with TypeScript
 * 
 * This is a known issue with React Navigation 7.x and TypeScript.
 * The navigators cannot be used as JSX components due to a missing 'refs' 
 * property. This declaration file augments the React types to fix this.
 * 
 * See: https://github.com/react-navigation/react-navigation/issues/11819
 */

import type { ComponentClass, FunctionComponent } from 'react';

declare module 'react' {
  // Fix for "Property 'refs' is missing in type 'Component'" errors
  // in React Navigation navigators
  interface Component<P = {}, S = {}, SS = any> {
    refs: {
      [key: string]: React.ReactInstance;
    };
  }
}

// Ensure the navigator types are usable as JSX elements
declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator<T extends Record<string, object | undefined>>(): {
    Navigator: FunctionComponent<any>;
    Screen: FunctionComponent<any>;
    Group: FunctionComponent<any>;
  };
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<T extends Record<string, object | undefined>>(): {
    Navigator: FunctionComponent<any>;
    Screen: FunctionComponent<any>;
    Group: FunctionComponent<any>;
  };
}

export {};
