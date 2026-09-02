"use client";

import { useRouter } from "next/navigation";

export default function AppHeader({
  title,
  sub,
  back = true,
}: {
  title: string;
  sub?: string;
  back?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="app-header">
      {back && (
        <button
          className="back"
          aria-label="뒤로"
          onClick={() => router.back()}
        >
          ‹
        </button>
      )}
      <h1>{title}</h1>
      {sub && <span className="sub">{sub}</span>}
    </header>
  );
}
