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
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_sync_states_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "monitored_accounts" ADD CONSTRAINT "monitored_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_accounts" ADD CONSTRAINT "monitored_accounts_spl_account_id_fkey" FOREIGN KEY ("spl_account_id") REFERENCES "spl_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
