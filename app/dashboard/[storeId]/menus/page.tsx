"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import { won } from "@/lib/useCart";
import type { Menu, MenuTags, PriceRange } from "@/lib/types";

interface FormState {
  name: string;
  price: string;
  description: string;
  category: string;
  spicy: string;
  price_range: PriceRange | "";
}

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  description: "",
  category: "",
  spicy: "0",
  price_range: "",
};

function toForm(m: Menu): FormState {
  return {
    name: m.name,
    price: String(m.price),
    description: m.description ?? "",
    category: m.tags.category ?? "",
    spicy: String(m.tags.spicy ?? 0),
    price_range: m.tags.price_range ?? "",
  };
}

export default function MenusPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Menu | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/stores/${storeId}/menus`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((data: { menus: Menu[] }) =>
        setMenus([...data.menus].sort((a, b) => a.id - b.id)),
      )
      .catch((e) => setError(`메뉴를 불러오지 못했습니다 (${e.message})`));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m: Menu) => {
    setEditing(m);
    setForm(toForm(m));
    setError(null);
    setShowForm(true);
  };

  const save = async () => {
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
      setError("메뉴명과 올바른 가격을 입력하세요.");
      return;
    }

    const tags: MenuTags = {
      ...(form.category.trim() ? { category: form.category.trim() } : {}),
      spicy: Number(form.spicy) || 0,
      ...(form.price_range ? { price_range: form.price_range } : {}),
    };
    const body = {
      name: form.name.trim(),
      price,
      description: form.description.trim() || null,
      tags,
    };

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editing
          ? `/api/stores/${storeId}/menus/${editing.id}`
          : `/api/stores/${storeId}/menus`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error(String(res.status));
      setShowForm(false);
      load();
    } catch (e) {
      setError(`저장 실패 (${(e as Error).message})`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Menu) => {
    if (!confirm(`"${m.name}" 메뉴를 삭제할까요?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/menus/${m.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(res.status));
      load();
    } catch (e) {
      setError(`삭제 실패 (${(e as Error).message})`);
    }
  };

  return (
    <>
      <AppHeader title="메뉴 관리" sub={`매장 ${storeId}`} />

      <div className="section">
        {error && <p className="blurb">{error}</p>}
        <button className="btn" onClick={openCreate}>
          메뉴 추가
        </button>
      </div>

      {menus.length === 0 ? (
        <p className="empty">등록된 메뉴가 없습니다.</p>
      ) : (
        <div className="menu-list">
          {menus.map((m) => (
            <div key={m.id} className="menu-row" style={{ cursor: "default" }}>
              <div>
                <div className="name">{m.name}</div>
                <div className="meta">
                  {won(m.price)} · {m.tags.category ?? "-"} · 맵기{" "}
                  {m.tags.spicy ?? 0}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="btn ghost" onClick={() => openEdit(m)}>
                  수정
                </button>
                <button className="btn ghost" onClick={() => remove(m)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="sheet-backdrop" onClick={() => setShowForm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "메뉴 수정" : "메뉴 추가"}</h3>
            <div className="card-form">
              <div>
                <label className="field">메뉴명</label>
                <input
                  className="inp"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field">가격</label>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field">설명</label>
                <input
                  className="inp"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="two">
                <div>
                  <label className="field">카테고리</label>
                  <input
                    className="inp"
                    placeholder="찌개, 볶음…"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field">맵기 (0~5)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    max={5}
                    value={form.spicy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, spicy: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="field">가격대</label>
                <select
                  className="inp"
                  value={form.price_range}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price_range: e.target.value as PriceRange | "",
                    }))
                  }
                >
                  <option value="">선택 안 함</option>
                  <option value="low">low</option>
                  <option value="mid">mid</option>
                  <option value="high">high</option>
                </select>
              </div>
            </div>
            <button
              className="btn"
              style={{ marginTop: 16 }}
              onClick={save}
              disabled={saving}
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
