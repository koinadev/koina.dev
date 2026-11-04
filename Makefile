.DEFAULT_GOAL := help
.PHONY: help install env dev dev-api dev-app dev-web dev-mobile infra-up infra-down \
	migrate seed check test build deploy-web deploy-api deploy-app export

help: ## Komutları listeler
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Bağımlılıkları kurar
	bun install

env: ## Eksik yerel env dosyalarını örneklerden oluşturur
	@test -f apps/api/.dev.vars || cp apps/api/.dev.vars.example apps/api/.dev.vars
	@test -f apps/mobile/.env.local || cp apps/mobile/.env.example apps/mobile/.env.local

dev: env infra-up ## Postgres + API (8787), web uygulaması (5173) ve landing (4321)
	bun --filter @koina/api --filter @koina/app --filter @koina/web dev

dev-api: env infra-up ## Yalnızca API: http://localhost:8787
	bun run dev:api

dev-app: ## Yalnızca web uygulaması: http://localhost:5173
	bun run dev:app

dev-web: ## Yalnızca landing: http://localhost:4321
	bun run dev:web

dev-mobile: env ## Expo geliştirme sunucusu
	bun run dev:mobile

infra-up: ## Yerel Postgres + PgBouncer (Docker)
	bun run infra:up

infra-down: ## Yerel altyapıyı durdurur
	bun run infra:down

migrate: ## Migration'ları uygular
	bun run db:migrate

seed: ## Yerel veritabanına örnek veri
	bun run seed

check: ## Tüm paketlerde tip denetimi
	bun run check

test: infra-up ## Tüm paketlerde testler
	bun run test

build: ## Siteyi derler
	bun run build

deploy-web: ## Siteyi yayına alır
	bun run deploy:web

deploy-api: ## API'yi yayına alır
	bun run deploy:api

deploy-app: ## Web uygulamasını yayına alır
	bun run deploy:app

export: ## Ön kayıtları CSV indirir (ana dizine; dosya adı için: make export OUT=liste.csv)
	bun apps/web/scripts/export-presignups.ts $(OUT)
