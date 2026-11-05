# Developer entry points for this repo. Every target wraps a pnpm/nx script or a
# documented command from README.md; the Makefile adds nothing that cannot be
# run by hand. Run `make` or `make help` for the list.
#
# Node must be the major pinned in .nvmrc; `make check-node` enforces it and the
# toolchain targets depend on it. Agents never call eslint/vitest/ng directly,
# so neither does this file.

SHELL := /bin/bash
.DEFAULT_GOAL := help

PNPM          ?= pnpm
NODE_MAJOR    := $(shell cat .nvmrc)
PNPM_VERSION  := $(shell sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' package.json)
IMAGE         ?= shell:local
PORT          ?= 4000
ALLOWED_HOSTS ?= localhost

.PHONY: help check-node setup install hooks browsers dev build serve preview \
        verify verify-quick verify-all lint test e2e format format-check \
        tokens depcruise graph knip mutate reset docker-build docker-run clean

## ───────────────────────── Setup ─────────────────────────

help: ## List available targets
	@awk 'BEGIN {FS = ":.*## "} \
	  /^## / {printf "\n%s\n", substr($$0, 4); next} \
	  /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo

check-node: ## Fail unless the active Node major matches .nvmrc
	@actual=$$(node -p 'process.versions.node.split(".")[0]'); \
	if [ "$$actual" != "$(NODE_MAJOR)" ]; then \
	  echo "Node $$actual active; .nvmrc wants $(NODE_MAJOR). Run: nvm use" >&2; exit 1; \
	fi

setup: check-node install browsers ## Fresh-clone setup: dependencies, git hooks, Playwright browser
	@echo "Setup complete. Try: make verify-all, then make dev"

install: check-node ## Install dependencies (also installs git hooks via prepare)
	@command -v $(PNPM) >/dev/null || { echo "pnpm missing. Run: npm i -g pnpm@$(PNPM_VERSION)" >&2; exit 1; }
	$(PNPM) install

hooks: ## Re-install the git hooks without reinstalling dependencies
	node .claude/hooks/install-git-hooks.mjs

browsers: ## Download the Chromium build Playwright needs for e2e
	$(PNPM) exec playwright install chromium

## ──────────────────────── Develop ────────────────────────

dev: check-node ## SSR dev server with live reload on http://localhost:4200
	$(PNPM) nx run shell:serve

build: check-node ## Production SSR build into dist/apps/shell
	$(PNPM) build

serve: ## Run the production SSR server from dist (PORT, default 4000)
	PORT=$(PORT) NG_ALLOWED_HOSTS=$(ALLOWED_HOSTS) $(PNPM) serve:ssr

preview: build serve ## Build, then serve the production bundle

tokens: ## Rebuild design tokens (CSS vars + TS types) from DTCG JSON
	$(PNPM) tokens

## ───────────────────────── Verify ─────────────────────────

verify: check-node ## Affected verification pipeline (what pre-push runs)
	$(PNPM) verify

verify-quick: check-node ## First seven stages only (what the hooks and pre-commit run)
	$(PNPM) verify:quick

verify-all: check-node ## Full pipeline on every project (what CI runs)
	$(PNPM) verify:all

lint: ## Lint every project
	$(PNPM) lint

test: ## Unit tests for every project
	$(PNPM) test

e2e: ## Playwright acceptance tests against the production server
	$(PNPM) e2e

format: ## Format the workspace with Prettier via nx
	$(PNPM) format

format-check: ## Check formatting without writing
	$(PNPM) format:check

depcruise: ## Validate the dependency graph against .dependency-cruiser.cjs
	$(PNPM) depcruise

graph: ## Render the dependency graph to reports/dependency-graph.svg (needs graphviz)
	$(PNPM) depcruise:graph

knip: ## Report dead code and unused dependencies
	$(PNPM) knip

mutate: ## Run Stryker mutation testing
	$(PNPM) mutate

reset: ## Clear the Nx cache and restart the daemon (fixes stale "package not used" lint errors)
	$(PNPM) nx reset

## ───────────────────────── Docker ─────────────────────────

docker-build: ## Build the distroless SSR image (IMAGE, default shell:local)
	docker build -t $(IMAGE) .

docker-run: ## Run the image (PORT, ALLOWED_HOSTS, IMAGE overridable)
	docker run --rm -p $(PORT):4000 -e NG_ALLOWED_HOSTS=$(ALLOWED_HOSTS) $(IMAGE)

## ───────────────────────── Clean ─────────────────────────

clean: ## Remove build output, caches and reports (keeps node_modules)
	rm -rf dist .angular .nx/cache .nx/workspace-data coverage reports/dependency-graph.svg .stryker-tmp tmp
