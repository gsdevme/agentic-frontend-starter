// Builds DTCG tokens into CSS custom properties and a TypeScript literal-type module.
// Run via `pnpm nx run design-tokens:build`. Output is committed so the app and lint rules
// can consume it without a build step; CI fails if the committed output is stale.
import StyleDictionary from 'style-dictionary';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const sd = new StyleDictionary({
  source: [join(here, 'tokens/**/*.json')],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'ds',
      buildPath: join(here, 'src/'),
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: { outputReferences: true, selector: ':root' },
        },
      ],
    },
    ts: {
      transformGroup: 'js',
      prefix: 'ds',
      buildPath: join(here, 'src/'),
      files: [
        {
          destination: 'tokens.ts',
          format: 'javascript/es6',
        },
        {
          destination: 'tokens.d.ts',
          format: 'typescript/es6-declarations',
          options: { outputStringLiterals: true },
        },
      ],
    },
  },
});

await sd.hasInitialized;
await sd.buildAllPlatforms();
