import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { denyUnlessStoreOwner } from "@/lib/authz";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — 메뉴 사진엔 충분하고 Blob 무료 티어도 아낀다
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * POST /api/stores/[storeId]/upload  (multipart/form-data, field: "file")
 * 메뉴 사진을 Vercel Blob 에 올리고 공개 URL 을 돌려준다. 점주 전용.
 *
 * BLOB_READ_WRITE_TOKEN 이 없으면(= Vercel 대시보드에서 Blob 스토어를 아직 안 만든
 * 상태) 500 대신 안내 메시지를 준다 — 나머지 기능은 그대로 돌아가야 하므로.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }

  const denied = await denyUnlessStoreOwner(id);
  if (denied) return denied;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "이미지 저장소가 아직 연결되지 않았습니다. Vercel 대시보드 > Storage 에서 Blob 스토어를 만들어 주세요.",
      },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "file 필드가 필요합니다" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "JPG·PNG·WEBP·GIF 이미지만 올릴 수 있습니다" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "이미지는 4MB 이하만 올릴 수 있습니다" },
      { status: 400 },
    );
  }

  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const blob = await put(`menus/${id}/${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("POST upload failed", err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
