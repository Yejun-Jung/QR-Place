"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import AppHeader from "@/app/ui/AppHeader";
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
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 });
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
  const [tableCount, setTableCount] = useState(10);
  const [tables, setTables] = useState<string[] | null>(null);

  const generate = () => {
    const count = Math.min(Math.max(Math.floor(tableCount), 1), 100);
    setTables(Array.from({ length: count }, (_, i) => String(i + 1)));
  };

  return (
    <>
      <AppHeader title="QR 코드 생성" sub={`매장 ${storeId}`} />

      <div className="section">
        <label>
          테이블 개수
          <input
            type="number"
            min={1}
            max={100}
            value={tableCount}
            onChange={(e) => setTableCount(Number(e.target.value))}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>
        <button className="btn" style={{ marginTop: 12 }} onClick={generate}>
          생성
        </button>
      </div>

      {tables && (
        <div className="qr-grid">
          {tables.map((t) => (
            <QrCard key={t} storeId={storeId} table={t} />
          ))}
        </div>
      )}
    </>
  );
}
