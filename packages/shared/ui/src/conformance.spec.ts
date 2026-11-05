/**
 * Design-system conformance. Runs as a normal unit test so it gates `nx test ui`.
 *
 * [REQ-DS-001] Every component in src/lib has a colocated *.spec.ts.
 * [REQ-DS-002] Component stylesheets use design tokens only: no raw colour literals,
 *              no hard-coded px font sizes or spacing.
 * [REQ-DS-003] Every component is exported from the public index.
 */
const sources = import.meta.glob('./lib/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const styles = import.meta.glob('./lib/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const publicApi = import.meta.glob('./index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const componentFiles = Object.entries(sources)
  .filter(
    ([file, src]) => !file.endsWith('.spec.ts') && /@Component\(/.test(src),
  )
  .map(([file]) => file);

const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const RAW_SIZE =
  /\b(font-size|padding|margin|gap|border-radius)\s*:\s*[0-9.]+(px|rem|em)/i;

describe('design-system conformance', () => {
  it('[REQ-DS-001] every component has a colocated spec', () => {
    const missing = componentFiles.filter(
      (file) => !(file.replace(/\.ts$/, '.spec.ts') in sources),
    );
    expect(missing).toEqual([]);
  });

  it('[REQ-DS-002] component styles reference tokens only', () => {
    const offenders = Object.entries(styles)
      .filter(([, css]) => RAW_COLOUR.test(css) || RAW_SIZE.test(css))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('[REQ-DS-003] every component class is exported from the public index', () => {
    const index = Object.values(publicApi)[0] ?? '';
    const unexported = componentFiles.filter((file) => {
      const className = /export class (\w+)/.exec(sources[file] ?? '')?.[1];
      return className !== undefined && !index.includes(className);
    });
    expect(unexported).toEqual([]);
  });
});
