import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  readJson,
  readProjectConfiguration,
  updateJson,
  updateProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { libraryGenerator } from '@nx/angular/generators';
import * as path from 'path';
import type { FeatureGeneratorSchema } from './schema';

const SHELL_ROUTES = 'apps/shell/src/app/app.routes.ts';
const SCOPES_DOC = 'docs/architecture/scopes.md';

/**
 * Deterministic feature scaffold. Everything an agent would otherwise have to
 * remember (tags, import path, lazy route, OnPush, spec stub, README) is
 * produced here so reviews only need to look at behaviour.
 */
export async function featureGenerator(
  tree: Tree,
  options: FeatureGeneratorSchema,
): Promise<void> {
  assertSpecExists(tree, options.spec);
  assertScopeRegistered(tree, options.scope);

  const n = names(options.name);
  const projectName = `${options.scope}-feature-${n.fileName}`;
  const directory = `packages/${options.scope}/feature-${n.fileName}`;
  const importPath = `@starter/${options.scope}/feature-${n.fileName}`;
  const routePath = options.route ?? n.fileName;
  const renderMode = options.renderMode ?? 'server';

  if (tree.exists(directory)) {
    throw new Error(`${directory} already exists. Pick another name.`);
  }

  await libraryGenerator(tree, {
    name: projectName,
    directory,
    importPath,
    tags: `scope:${options.scope},type:feature`,
    prefix: options.scope,
    standalone: true,
    buildable: true,
    unitTestRunner: 'vitest-angular' as never,
    linter: 'eslint' as never,
    skipModule: true,
    skipFormat: true,
    routing: false,
    lazy: false,
  });

  // Replace the generated placeholder component and lint config with our opinionated files.
  tree.delete(joinPathFragments(directory, 'src/lib'));
  tree.delete(joinPathFragments(directory, 'eslint.config.mjs'));
  generateFiles(tree, path.join(__dirname, 'files'), directory, {
    ...n,
    scope: options.scope,
    spec: options.spec,
    routePath,
    renderMode,
    importPath,
    projectName,
    tmpl: '',
  });

  declarePeerDependencies(tree, directory, ['@angular/core', '@angular/router']);
  wireLazyRoute(tree, importPath, routePath, n.className);
  wireServerRoute(tree, routePath, renderMode);
  ensureImplicitDependencyOnSpec(tree, projectName, options.spec);

  await formatFiles(tree);
}

function assertSpecExists(tree: Tree, spec: string): void {
  if (!tree.exists(spec)) {
    throw new Error(
      `Spec not found: ${spec}\n` +
        `A feature may only be scaffolded from an approved design doc in docs/superpowers/specs/. ` +
        `Run the superpowers:brainstorming skill first and get the spec approved.`,
    );
  }
  const content = tree.read(spec, 'utf-8') ?? '';
  if (!/^status:\s*approved/im.test(content)) {
    throw new Error(
      `Spec ${spec} is not approved. Add a line "Status: approved" (set by a human reviewer) before scaffolding.`,
    );
  }
}

function assertScopeRegistered(tree: Tree, scope: string): void {
  if (scope === 'shared') {
    throw new Error(
      `'shared' is reserved for cross-cutting libraries and cannot own features.`,
    );
  }
  const doc = tree.read(SCOPES_DOC, 'utf-8') ?? '';
  const registered = new RegExp(`^\\|\\s*\`${scope}\`\\s*\\|`, 'm').test(doc);
  if (!registered) {
    throw new Error(
      `Scope '${scope}' is not registered in ${SCOPES_DOC}. ` +
        `Add a row for it (with an owner and description) and the matching depConstraint in eslint.config.mjs first.`,
    );
  }
}

function wireLazyRoute(
  tree: Tree,
  importPath: string,
  routePath: string,
  className: string,
): void {
  const src = tree.read(SHELL_ROUTES, 'utf-8');
  if (src === null) {
    throw new Error(`${SHELL_ROUTES} is missing.`);
  }
  if (src.includes(`'${importPath}'`)) {
    return;
  }
  const entry =
    `  {\n    path: '${routePath}',\n` +
    `    loadChildren: () => import('${importPath}').then((m) => m.${className}Routes),\n  },\n`;
  const marker = 'export const appRoutes: Route[] = [';
  if (!src.includes(marker)) {
    throw new Error(
      `${SHELL_ROUTES} must contain "${marker}" so routes can be appended deterministically.`,
    );
  }
  tree.write(SHELL_ROUTES, src.replace(marker, `${marker}\n${entry}`));
}

function wireServerRoute(
  tree: Tree,
  routePath: string,
  renderMode: 'server' | 'prerender' | 'client',
): void {
  const file = 'apps/shell/src/app/app.routes.server.ts';
  const src = tree.read(file, 'utf-8');
  if (src === null) {
    return;
  }
  const mode = { server: 'Server', prerender: 'Prerender', client: 'Client' }[
    renderMode
  ];
  const entry = `  {\n    path: '${routePath}',\n    renderMode: RenderMode.${mode},\n  },\n  {\n    path: '${routePath}/**',\n    renderMode: RenderMode.${mode},\n  },\n`;
  const marker = 'export const serverRoutes: ServerRoute[] = [';
  if (src.includes(`path: '${routePath}'`) || !src.includes(marker)) {
    return;
  }
  tree.write(file, src.replace(marker, `${marker}\n${entry}`));
}

/** Mirror the root Angular version into the library's peerDependencies (checked by @nx/dependency-checks). */
function declarePeerDependencies(
  tree: Tree,
  directory: string,
  packages: readonly string[],
): void {
  const root = readJson<{ dependencies?: Record<string, string> }>(
    tree,
    'package.json',
  );
  updateJson<{ peerDependencies?: Record<string, string> }>(
    tree,
    joinPathFragments(directory, 'package.json'),
    (pkg) => {
      pkg.peerDependencies = Object.fromEntries(
        packages.map((name) => [
          name,
          root.dependencies?.[name] ?? '*',
        ]),
      );
      return pkg;
    },
  );
}

/** Changing the spec invalidates the feature's cached tasks so tests re-run against it. */
function ensureImplicitDependencyOnSpec(
  tree: Tree,
  projectName: string,
  spec: string,
): void {
  const config = readProjectConfiguration(tree, projectName);
  config.namedInputs = {
    ...(config.namedInputs ?? {}),
    default: ['{projectRoot}/**/*', 'sharedGlobals', `{workspaceRoot}/${spec}`],
  };
  updateProjectConfiguration(tree, projectName, config);
}

export default featureGenerator;
