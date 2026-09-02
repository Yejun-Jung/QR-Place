import { NextRequest, NextResponse } from "next/server";
import { parseKakaoSearchResults } from "@/lib/kakao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/kakao/search?query=매장명
 * 카카오 로컬 API(키워드 검색)를 서버에서 대신 호출한다.
 * REST API 키는 여기(서버)에만 존재하고 브라우저로는 절대 내려가지 않는다.
 */
export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY 가 설정되지 않았습니다 (.env.local 확인)" },
      { status: 500 },
    );
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `카카오 API 오류 (${res.status})` },
        { status: res.status === 401 ? 500 : res.status },
      );
    }

    const raw = await res.json();
    return NextResponse.json({ places: parseKakaoSearchResults(raw) });
  } catch (err) {
    console.error("GET /api/kakao/search failed", err);
    return NextResponse.json({ error: "카카오 API 호출 실패" }, { status: 500 });
  }
}
