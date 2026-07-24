"use client";

import { useEffect, useState } from "react";

type Settings = {
  searchAreas: string[];
  categories: string[];
  targetLeadCount: number;
};

export default function AjustesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [areasText, setAreasText] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [targetLeadCount, setTargetLeadCount] = useState(30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setAreasText(data.searchAreas.join("\n"));
        setCategoriesText(data.categories.join("\n"));
        setTargetLeadCount(data.targetLeadCount);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const body = {
      searchAreas: areasText.split("\n").map((s) => s.trim()).filter(Boolean),
      categories: categoriesText.split("\n").map((s) => s.trim()).filter(Boolean),
      targetLeadCount,
    };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSettings(data);
    setSaving(false);
    setSaved(true);
  }

  if (!settings) {
    return <p className="text-sm text-slate-500">Cargando ajustes…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Ajustes de búsqueda</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define dónde y qué tipo de negocios buscar cada semana. Estos cambios aplican al
          próximo lote generado (manual o por cron).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Zonas de búsqueda (una por línea)
        </label>
        <textarea
          value={areasText}
          onChange={(e) => setAreasText(e.target.value)}
          rows={8}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Rubros / tipo de negocio a buscar (uno por línea)
        </label>
        <textarea
          value={categoriesText}
          onChange={(e) => setCategoriesText(e.target.value)}
          rows={8}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Cantidad de clientes por semana
        </label>
        <input
          type="number"
          min={1}
          value={targetLeadCount}
          onChange={(e) => setTargetLeadCount(Number(e.target.value))}
          className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {saved ? <span className="text-sm text-green-600">Guardado</span> : null}
      </div>
    </div>
  );
}
