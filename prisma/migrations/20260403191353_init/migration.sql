-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "spl_account_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitored_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spl_accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "token_status" TEXT NOT NULL DEFAULT 'unknown',
    "token_verified_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" INTEGER NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_balances" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "season_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "season_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "accounts_processed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "worker_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_leaderboards" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "season_id" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "rating" INTEGER,
    "rank" INTEGER,
    "battles" INTEGER,
    "wins" INTEGER,
    "longest_streak" INTEGER,
    "max_rating" INTEGER,
    "league" INTEGER,
    "max_league" INTEGER,
    "rshares" DOUBLE PRECISION,

    CONSTRAINT "player_leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_sync_states" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "last_season_processed" INTEGER NOT NULL DEFAULT 0,
    "last_synced_created_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "username" TEXT NOT NULL,
    "collection_market_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collection_list_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collection_details" JSONB,
    "dec_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dec_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dec_staked_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dec_staked_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sps_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sps_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spsp_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spsp_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voucher_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voucher_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credits_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credits_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dec_b_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dec_b_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voucher_g_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voucher_g_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "license_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "license_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deeds_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deeds_qty" INTEGER NOT NULL DEFAULT 0,
    "deed_details" JSONB,
    "land_resource_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "land_resource_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "land_resource_detailed" JSONB,
    "liq_pool_dec_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liq_pool_dec_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liq_pool_sps_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liq_pool_sps_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventory_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventory_qty" INTEGER NOT NULL DEFAULT 0,
    "inventory_detail" JSONB,
    "dec_price_usd" DOUBLE PRECISION,
    "hive_price_usd" DOUBLE PRECISION,
    "sps_price_usd" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "monitored_accounts_user_id_idx" ON "monitored_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_accounts_user_id_username_key" ON "monitored_accounts"("user_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "spl_accounts_username_key" ON "spl_accounts"("username");

-- CreateIndex
CREATE INDEX "logs_level_idx" ON "logs"("level");

-- CreateIndex
CREATE INDEX "logs_created_at_idx" ON "logs"("created_at");

-- CreateIndex
CREATE INDEX "season_balances_username_idx" ON "season_balances"("username");

-- CreateIndex
CREATE INDEX "season_balances_season_id_idx" ON "season_balances"("season_id");

-- CreateIndex
CREATE UNIQUE INDEX "season_balances_username_season_id_token_type_key" ON "season_balances"("username", "season_id", "token", "type");

-- CreateIndex
CREATE INDEX "worker_runs_started_at_idx" ON "worker_runs"("started_at");

-- CreateIndex
CREATE INDEX "player_leaderboards_username_idx" ON "player_leaderboards"("username");

-- CreateIndex
CREATE INDEX "player_leaderboards_season_id_idx" ON "player_leaderboards"("season_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_leaderboards_username_season_id_format_key" ON "player_leaderboards"("username", "season_id", "format");

-- CreateIndex
CREATE INDEX "account_sync_states_status_idx" ON "account_sync_states"("status");

-- CreateIndex
CREATE UNIQUE INDEX "account_sync_states_username_key_key" ON "account_sync_states"("username", "key");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_username_idx" ON "portfolio_snapshots"("username");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_date_idx" ON "portfolio_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_snapshots_username_date_key" ON "portfolio_snapshots"("username", "date");

-- AddForeignKey
ALTER TABLE "monitored_accounts" ADD CONSTRAINT "monitored_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_accounts" ADD CONSTRAINT "monitored_accounts_spl_account_id_fkey" FOREIGN KEY ("spl_account_id") REFERENCES "spl_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
