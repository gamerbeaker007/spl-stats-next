import prisma from "@/lib/prisma";

type DbSizeRow = { size: string; size_bytes: bigint };
type TableSizeRow = { table_name: string; total_size: string; size_bytes: bigint };

export type DatabaseSize = {
  totalSize: string;
  totalBytes: number;
  tables: { tableName: string; totalSize: string; sizeBytes: number }[];
};

export async function getDatabaseSize(): Promise<DatabaseSize> {
  const [dbRows, tableRows] = await Promise.all([
    prisma.$queryRaw<DbSizeRow[]>`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) AS size,
        pg_database_size(current_database()) AS size_bytes
    `,
    prisma.$queryRaw<TableSizeRow[]>`
      SELECT
        relname AS table_name,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_total_relation_size(relid) AS size_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY size_bytes DESC
    `,
  ]);

  return {
    totalSize: dbRows[0]?.size ?? "unknown",
    totalBytes: Number(dbRows[0]?.size_bytes ?? 0),
    tables: tableRows.map((r) => ({
      tableName: r.table_name,
      totalSize: r.total_size,
      sizeBytes: Number(r.size_bytes),
    })),
  };
}
