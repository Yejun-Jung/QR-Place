"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import AppHeader from "@/app/ui/AppHeader";
import { useStoreName } from "@/app/ui/useStoreName";
import { buildTableQrUrl } from "@/lib/qr";

function QrCard({
  storeId,
  table,
}: {
  storeId: string;
  table: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = buildTableQrUrl(window.location.origin, storeId, table);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, url, { width: 220, margin: 1 }).then(() => {
      // toCanvas 가 인라인 style(width/height: 220px)을 박아넣어 CSS 를 덮어쓴다.
      // 카드보다 큰 화면 폭에서 QR 이 카드 밖으로 삐져나오므로 지워서 CSS 에 맡긴다.
      canvas.style.removeProperty("width");
      canvas.style.removeProperty("height");
    });
  }, [url]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `table-${table}.png`;
    a.click();
  };

  return (
    <div className="qr-card">
      <canvas ref={canvasRef} />
      <div className="label">테이블 {table}</div>
      <div className="url">{url}</div>
      <button className="btn ghost" onClick={download}>
        다운로드
      </button>
    </div>
  );
}

export default function QrPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const storeName = useStoreName(storeId);
  const [tableCount, setTableCount] = useState(10);
  const [tables, setTables] = useState<string[] | null>(null);

  const generate = () => {
    const count = Math.min(Math.max(Math.floor(tableCount), 1), 100);
    setTables(Array.from({ length: count }, (_, i) => String(i + 1)));
  };

  return (
    <>
      <AppHeader title="QR 코드 생성" sub={storeName ?? `매장 ${storeId}`} />

      <div className="section">
        <div className="qr-form">
          <div className="intro">
            <h3>테이블 QR 만들기</h3>
            <p className="muted">
              테이블 수만큼 QR을 만들어 인쇄한 뒤 각 자리에 두세요. 손님이
              스캔하면 그 테이블 번호로 주문이 들어옵니다.
            </p>
          </div>

          <div className="count-field">
            <label className="field" htmlFor="tableCount">
              테이블 개수 (1~100)
            </label>
            <input
              id="tableCount"
              className="inp"
              type="number"
              min={1}
              max={100}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value))}
            />
          </div>

          <button className="btn" onClick={generate}>
            QR 생성
          </button>
        </div>
      </div>

      {tables && (
        <>
          <div className="section" style={{ paddingBottom: 0 }}>
            <div className="list-head">
              <span className="list-head-label">
                생성된 QR {tables.length}개 · 카드마다 따로 내려받을 수 있어요
              </span>
            </div>
          </div>
          <div className="qr-grid">
            {tables.map((t) => (
              <QrCard key={t} storeId={storeId} table={t} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
