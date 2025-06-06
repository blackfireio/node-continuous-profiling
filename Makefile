SHELL=/bin/bash -euo pipefail
.DEFAULT_GOAL := help

COMPOSE_CONFIG = -f docker-compose.yml
COMPOSE = docker compose --project-name blackfire --project-directory . $(COMPOSE_CONFIG)

ifeq ($(MAKE_USE_DOCKER),true)
	ON_NODE=$(COMPOSE) run --rm --no-deps nodejs
else
	ON_NODE=
endif

NODE_VERSION ?= latest
ON_NODE_PRUNE=docker run --rm -w /workspace -v $(shell pwd):/workspace node:$(NODE_VERSION)

##
### Tests
##

test: npm-install ## Runs tests suite
ifdef GITLAB_CI
	$(ON_NODE_PRUNE) npm run test
else
	$(ON_NODE) npm run test
endif
.PHONY: test

eslint: npm-install ## Runs Eslint to report code style issues
ifdef GITLAB_CI
	$(ON_NODE_PRUNE) npx eslint src/ tests/
else
	$(ON_NODE) npx eslint src/ tests/
endif

eslint-fix: npm-install ## Runs Eslint to fix code style issues
	$(ON_NODE) npx eslint --fix src/ tests/

print-version:
	@jq -r '.version' package.json

##
### Npm
##
npm-install: package-lock.json ## Install node dependencies
.PHONY: npm-install

package-lock.json:
ifdef GITLAB_CI
	$(ON_NODE_PRUNE) npm install
else
	$(ON_NODE) npm install
endif

npm-clear: ## Delete local dependencies
	rm -rf ./package-lock.json ./node_modules

##
### Docker
##

setup: docker-build npm-install up ## Setup all needed containers
.PHONY: setup

up: ## Launch docker containers (services="")
	@$(COMPOSE) up -d $(services)
.PHONY: up

docker-build: ## Build the docker images (services="")
	@$(COMPOSE) build $(services)
.PHONY: build

ps: ## List docker containers (services="")
	@$(COMPOSE) ps $(services)
.PHONY: ps

logs: ## Show docker containers logs (services="")
	@$(COMPOSE) logs -f $(services)
.PHONY: logs

dump-logs: ## Dump docker containers logs without following (services="")
	@$(COMPOSE) logs $(services)
.PHONY: dump-logs

restart: ## Restart containers (services="")
	@$(COMPOSE) restart $(services)
.PHONY: restart

stop: ## Stop containers (services="")
	@$(COMPOSE) stop $(services)
.PHONY: stop

recreate: stop rm up ## Recreate containers (services="")
.PHONY: recreate

rm: ## Remove containers (services="")
	@$(COMPOSE) rm -f $(services)
.PHONY: rm

down: ## Stop and remove containers and volumes
	@$(COMPOSE) down --remove-orphans --volumes
.PHONY: down

run: ## Run a shell in the node container
	@$(COMPOSE) run --rm nodejs bash
.PHONY: run

##
### Misc
##

help: ## Displays help for Makefile commands
	@grep -hE '(^[a-zA-Z_-]+:.*?##.*$$)|(^###)' $(MAKEFILE_LIST) | grep -vhE '(^###[<>])' | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m\n/'
.PHONY: help
