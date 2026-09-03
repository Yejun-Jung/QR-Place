/** 결제수단 선택 카드용 아이콘 — 이모지 대신 톤이 맞는 SVG 배지로 통일 */

export function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="22" rx="6" fill="#4f46e5" />
      <rect x="4.5" y="6.5" width="13" height="9" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.4" />
      <rect x="4.5" y="9" width="13" height="2" fill="#fff" />
    </svg>
  );
}

/** 카카오톡 말풍선 배지 — 카카오페이 결제수단용 */
export function KakaoPayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="22" rx="6" fill="#fee500" />
      <path
        fill="#191919"
        d="M11 5.4c-3.4 0-6.1 2.2-6.1 5 0 1.8 1.1 3.4 2.8 4.3-.1.5-.5 1.7-.6 2 0 0-.01.1.06.15.07.04.15 0 .15 0 .2-.03 2.3-1.5 2.6-1.7.3.05.7.07 1.05.07 3.4 0 6.1-2.2 6.1-5s-2.7-4.85-6.1-4.85z"
      />
    </svg>
  );
}

export function CounterIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="22" rx="6" fill="#16a34a" />
      <rect x="4.5" y="7" width="13" height="8.5" rx="1.4" fill="none" stroke="#fff" strokeWidth="1.4" />
      <circle cx="11" cy="11.25" r="2" fill="#fff" />
    </svg>
  );
}
