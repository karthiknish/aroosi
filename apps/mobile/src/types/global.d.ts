/**
 * Global type declarations
 */

declare global {
    /**
     * localStorage polyfill from expo-sqlite
     */
    const localStorage: {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
        removeItem(key: string): void;
        clear(): void;
        readonly length?: number;
        key?(index: number): string | null;
    };

    interface NodeRequire {
        context?: any;
    }
}

export {};
