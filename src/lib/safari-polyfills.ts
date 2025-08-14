// Safari compatibility polyfills
// This file includes polyfills for Safari to ensure proper functionality

// Check if we're running in Safari (guard for SSR where navigator is undefined)
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Polyfill for Array.flat() if not available (needed for older Safari versions)
if (typeof window !== 'undefined' && !Array.prototype.flat) {
  Object.defineProperty(Array.prototype, 'flat', {
    value: function(depth: number = 1): any[] {
      function flatten(arr: any[], depth: number): any[] {
        if (depth < 1) {
          return arr.slice();
        }
        return arr.reduce(function(acc: any[], val: any) {
          return acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val);
        }, []);
      }
      return flatten(this, depth);
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for Array.flatMap() if not available (needed for older Safari versions)
if (typeof window !== 'undefined' && !Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, 'flatMap', {
    value: function<T, U>(callback: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
      return this.map(callback, thisArg).flat();
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for Object.fromEntries() if not available (needed for Safari < 12.1)
if (typeof window !== 'undefined' && !Object.fromEntries) {
  Object.defineProperty(Object, 'fromEntries', {
    value: function(entries: Iterable<[string | number | symbol, any]>): Record<string | number | symbol, any> {
      if (!entries || !(Symbol.iterator in Object(entries))) {
        throw new Error('Object.fromEntries() requires a single iterable argument');
      }
      const obj: Record<string | number | symbol, any> = {};
      for (const [key, value] of entries) {
        obj[key] = value;
      }
      return obj;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for String.prototype.replaceAll() if not available (needed for Safari < 13.1)
if (typeof window !== 'undefined' && !String.prototype.replaceAll) {
  Object.defineProperty(String.prototype, 'replaceAll', {
    value: function(search: string | RegExp, replace: string): string {
      if (typeof search === 'string') {
        return this.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
      }
      return this.replace(search, replace);
    },
    configurable: true,
    writable: true
  });
}

// Ensure requestAnimationFrame is available (should be in Safari 6+ but just in case)
if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = ((window as any).webkitRequestAnimationFrame ||
    (window as any).mozRequestAnimationFrame ||
    (window as any).oRequestAnimationFrame ||
    (window as any).msRequestAnimationFrame ||
    function(callback: FrameRequestCallback) {
      window.setTimeout(callback, 1000 / 60);
    }) as typeof window.requestAnimationFrame;
}

// Ensure cancelAnimationFrame is available
if (typeof window !== 'undefined' && !window.cancelAnimationFrame) {
  window.cancelAnimationFrame = ((window as any).webkitCancelAnimationFrame ||
    (window as any).mozCancelAnimationFrame ||
    (window as any).oCancelAnimationFrame ||
    (window as any).msCancelAnimationFrame ||
    function(id: number) {
      window.clearTimeout(id);
    }) as typeof window.cancelAnimationFrame;
}

export {};