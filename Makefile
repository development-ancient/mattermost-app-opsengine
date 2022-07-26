.PHONY: run-server stop-server restart-server

run-server: ## Starts the server.
		@echo Running mattermost for development
		./run-server.sh

stop-server: ## Stops the server.
		@echo Stopping mattermost for development
		./stop-server.sh

restart-server: ## Restarts the server.
		@echo Stopping mattermost for development
		./stop-server.sh
		@echo Running mattermost for development
		./run-server.sh