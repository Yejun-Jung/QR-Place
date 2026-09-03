// SQLite 데모 어댑터 스모크 테스트 (DB 세팅 불필요)
// 실행: npm run smoke
import { sqliteAdapter } from "../lib/db.sqlite.ts";

const menus = await sqliteAdapter.getStoreMenus(1);
console.log(`메뉴 ${menus.length}개`);

const popularity = await sqliteAdapter.getMenuPopularity(1, 30);
console.log("최근 30일 주문수:", Object.fromEntries(popularity));

const paired = await sqliteAdapter.getPairedMenus(menus[0]?.id ?? 1, 3);
console.log(`"${menus[0]?.name}"과 함께 자주 시킨 메뉴:`, paired.map((m) => m.name));

const logs = await sqliteAdapter.getUserRecentLogs(1, 30);
console.log(`유저 1 최근 로그 ${logs.length}건`);

const inserted = await sqliteAdapter.insertViewLog({
  userId: 1,
  tableNumber: "SMOKE",
  storeId: 1,
  menuId: 3,
  actionType: "order",
});
console.log("로그 삽입:", inserted);

console.log("일별 방문자:", await sqliteAdapter.getDailyVisitors(1, 30));
console.log("인기 메뉴 TOP3:", await sqliteAdapter.getPopularMenus(1, 30, 3));

const visited = await sqliteAdapter.getVisitedStoresByUser(1);
console.log(
  `유저 1이 방문한 매장 ${visited.length}개:`,
  visited.map((s) => s.name),
);

console.log("룰렛 오늘 돌렸는지(가입 전):", await sqliteAdapter.hasSpunToday(1, 1));
await sqliteAdapter.recordSpin(1, 1);
console.log("룰렛 오늘 돌렸는지(기록 후):", await sqliteAdapter.hasSpunToday(1, 1));

console.log("\n✅ SQLite 어댑터 정상");
