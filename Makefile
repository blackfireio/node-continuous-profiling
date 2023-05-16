SHELL=/bin/bash -euo pipefail
.DEFAULT_GOAL := help

COMPOSE_CONFIG = -f docker-compose.yaml
COMPOSE = docker-compose --project-name blackfire --project-directory . $(COMPOSE_CONFIG)

ifeq ($(MAKE_USE_DOCKER),true)
	ON_NODE=$(COMPOSE) run --rm --no-deps nodejs
else
	ON_NODE=
endif

##
### Tests
##

test: yarn-install ## Runs tests suite
	$(ON_NODE) yarn test
.PHONY: test

eslint: yarn-install ## Runs Eslint to report code style issues
	$(ON_NODE) yarn eslint src/ tests/

eslint-fix: yarn-install ## Runs Eslint to fix code style issues
	$(ON_NODE) yarn eslint --fix src/ tests/

##
### Yarn
##
yarn-install: yarn.lock ## Install node dependencies
.PHONY: npm-install

yarn.lock:
	$(ON_NODE) yarn install

yarn-clear: ## Delete local dependencies
	rm -rf ./yarn.lock ./node_modules

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
