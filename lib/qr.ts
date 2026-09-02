// 테이블용 QR 코드가 가리킬 손님 메뉴판 URL을 만든다.
export function buildTableQrUrl(
  origin: string,
  storeId: string,
  table: string,
): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/stores/${storeId}?table=${encodeURIComponent(table)}`;
}
