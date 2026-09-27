/**
 * 받침 유무로 주격 조사(이/가)를 고른다. "통닭이", "콜라·사이다 (500ml)가".
 * 끝의 괄호 설명은 빼고 본다 — "(조각)"·"(500ml)" 같은 표기가 붙은 메뉴명이 많다.
 * 마지막 글자가 한글이 아니면(영문·숫자) 판단할 수 없어 "이(가)"로 둔다.
 */
export function subjectJosa(word: string): "이" | "가" | "이(가)" {
  const base = word.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const code = base.charCodeAt(base.length - 1) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return "이(가)";
  return code % 28 === 0 ? "가" : "이";
}
