/** Minimal typing for Vite's `import.meta.glob`, available in the Angular Vitest runner. Test-only. */
interface ImportMeta {
  glob<T = unknown>(
    pattern: string | readonly string[],
    options?: {
      eager?: boolean;
      import?: string;
      query?: string | Record<string, string | number | boolean>;
    },
  ): Record<string, T>;
}
