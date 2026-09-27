import { describe, expect, it } from "vitest";
import { fillDays } from "../chartDays";

const zero = (date: string) => ({ date, revenue: 0 });
const today = new Date(2026, 8, 27); // 2026-09-27 (로컬)

describe("fillDays", () => {
  it("데이터 없는 날을 0으로 채워 기간 전체를 날짜순으로 돌려준다", () => {
    const out = fillDays([{ date: "2026-09-25", revenue: 9000 }], 3, zero, today);
    expect(out).toEqual([
      { date: "2026-09-25", revenue: 9000 },
      { date: "2026-09-26", revenue: 0 },
      { date: "2026-09-27", revenue: 0 },
    ]);
  });

  it("기간 밖(시간대 차이)으로 온 서버 날짜도 버리지 않는다", () => {
    const out = fillDays([{ date: "2026-09-24", revenue: 5000 }], 2, zero, today);
    expect(out.map((r) => r.date)).toEqual(["2026-09-24", "2026-09-26", "2026-09-27"]);
  });
});
