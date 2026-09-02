// 스키마 + 시드 실행 스크립트
// 실행: npm run db:setup   (내부적으로 node --env-file=.env.local scripts/db.mjs)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sql } from "@vercel/postgres";

const here = dirname(fileURLToPath(import.meta.url));
const dbDir = join(here, "..", "db");

function statementsOf(file) {
  const raw = readFileSync(join(dbDir, file), "utf8");
  return raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function run(file) {
  console.log(`\n▶ ${file}`);
  for (const stmt of statementsOf(file)) {
    await sql.query(stmt);
    console.log(`  ok: ${stmt.split("\n")[0].slice(0, 70)}…`);
  }
}

try {
  await run("schema.sql");
  await run("seed.sql");
  console.log("\n✅ DB 준비 완료");
  process.exit(0);
} catch (err) {
  console.error("\n❌ 실패:", err);
  process.exit(1);
}
