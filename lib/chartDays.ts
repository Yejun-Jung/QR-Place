/**
 * 대시보드 일별 차트용: 주문·방문이 없는 날도 0으로 채워
 * "최근 N일" 전체가 x축에 보이게 한다. (DB는 데이터가 있는 날만 준다)
 *
 * 서버 날짜 버킷(UTC)과 브라우저 로컬 날짜가 하루 어긋날 수 있어서,
 * 서버가 준 날짜는 버리지 않고 합친 뒤 정렬한다.
 */
export function fillDays<T extends { date: string }>(
  rows: T[],
  days: number,
  empty: (date: string) => T,
  today: Date = new Date(),
): T[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString("sv-SE"); // 로컬 기준 YYYY-MM-DD
    if (!byDate.has(key)) byDate.set(key, empty(key));
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
