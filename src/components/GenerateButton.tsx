"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/leads/generate", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error desconocido");
      if (data.leadCount === 0) {
        setInfo(
          `No hay clientes nuevos por ahora (se revisaron ${data.areasTried} zonas). Los negocios de esas zonas ya están cargados; probá agregar más zonas en Ajustes o esperá a que aparezcan nuevos.`
        );
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Generando…" : "Generar lote ahora"}
      </button>
      {error ? <p className="max-w-xs text-right text-xs text-red-600">{error}</p> : null}
      {info ? <p className="max-w-xs text-right text-xs text-slate-500">{info}</p> : null}
    </div>
  );
}
