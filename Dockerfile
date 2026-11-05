# Production image for the Angular SSR shell (apps/shell).
#
# Two stages:
#   build   - Debian-slim Node with pnpm; installs the workspace and runs the Nx build.
#   runtime - distroless Node; carries only dist/apps/shell. The Angular application builder
#             bundles every third-party dependency (express, @angular/*) into the server
#             chunks, so the runtime needs no node_modules.
#
# Node major: .nvmrc is the source of truth (docs/adr/0002-node-latest-lts.md). FROM lines
# cannot read it, so the major is duplicated here as NODE_MAJOR and nowhere else.
# scripts/verify/node-version.mjs (the first `pnpm verify` stage) fails if it drifts from .nvmrc.
#
#   docker build -t shell:local .
#   docker run --rm -p 4000:4000 -e NG_ALLOWED_HOSTS=localhost shell:local

# An ARG declared before the first FROM is visible only in FROM lines.
ARG NODE_MAJOR=26

# ---------------------------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------------------------
FROM node:${NODE_MAJOR}-slim AS build

# Keep in step with package.json#packageManager.
ARG PNPM_VERSION=10.28.0

WORKDIR /app

# Node >= 25 no longer ships corepack, so pnpm comes from npm at the pinned version.
RUN npm install -g pnpm@${PNPM_VERSION}

# CI=1 keeps pnpm non-interactive; NX_DAEMON=false because a container build is a single
# short-lived process with nothing to share a daemon with.
ENV NX_DAEMON=false CI=1

# Manifests first, so the dependency layer stays cached until the lockfile changes. .npmrc sets
# engine-strict=true, so the install fails fast if this base image's Node major is wrong.
# --ignore-scripts: the root `prepare` script (git-hook installer) lives in .claude/, which is
# not in the build context. pnpm 10 already skips dependency build scripts that are not
# allow-listed, so this changes nothing else.
COPY package.json pnpm-lock.yaml .npmrc .nvmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

# shell:build's defaultConfiguration is production (apps/shell/project.json).
RUN pnpm exec nx run shell:build --skip-nx-cache

# ---------------------------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------------------------
# Distroless: no shell, no package manager, runs as uid 65532 (nonroot). Smaller attack surface
# and fewer CVEs than a full Node image. The image entrypoint is `node`, so CMD is just the
# script. For interactive debugging, change the tag to debug-nonroot locally (adds a busybox
# shell); never ship that tag.
FROM gcr.io/distroless/nodejs${NODE_MAJOR}-debian13:nonroot AS runtime

WORKDIR /app

# PORT is read by apps/shell/src/server.ts. NG_ALLOWED_HOSTS must be set at deploy time to the
# ingress hostnames, or Angular SSR answers 400 to every request.
ENV PORT=4000 NODE_ENV=production

COPY --from=build /app/dist/apps/shell ./dist/apps/shell

EXPOSE 4000

# No HEALTHCHECK: the image has no shell or curl to run one, and orchestrators (Kubernetes,
# ECS, Cloud Run) probe GET /healthz themselves.
CMD ["dist/apps/shell/server/server.mjs"]
