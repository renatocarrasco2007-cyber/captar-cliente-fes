"use client";

import { useMemo, useState, useTransition } from "react";
import type { LeadDTO } from "@/lib/types";
import { LEAD_STATUSES, type LeadStatus } from "@/db/schema";

const STATUS_LABELS: Record<LeadStatus, string> = {
  pendiente: "Pendiente",
  contactado: "Contactado",
  interesado: "Interesado",
  no_interesado: "No interesado",
  descartado: "Descartado",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  pendiente: "bg-slate-100 text-slate-700 border-slate-300",
  contactado: "bg-blue-50 text-blue-700 border-blue-300",
  interesado: "bg-green-50 text-green-700 border-green-300",
  no_interesado: "bg-amber-50 text-amber-700 border-amber-300",
  descartado: "bg-red-50 text-red-700 border-red-300",
};

function StatusSelect({
  leadId,
  status,
  onChanged,
}: {
  leadId: string;
  status: LeadStatus;
  onChanged: (status: LeadStatus) => void;
}) {
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  async function handleChange(next: LeadStatus) {
    onChanged(next);
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={(e) => startTransition(() => handleChange(e.target.value as LeadStatus))}
      className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]} disabled:opacity-60`}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function NotesCell({ leadId, initialNotes }: { leadId: string; initialNotes: string | null }) {
  const [value, setValue] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(true);

  async function save() {
    if (saved) return;
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    setSaved(true);
  }

  return (
    <textarea
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setSaved(false);
      }}
      onBlur={save}
      rows={1}
      placeholder="Notas…"
      className="w-full min-w-[10rem] resize-y rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
    />
  );
}

export function LeadTable({ leads }: { leads: LeadDTO[] }) {
  const [rows, setRows] = useState(leads);

  const stats = useMemo(() => {
    const base: Record<LeadStatus, number> = {
      pendiente: 0,
      contactado: 0,
      interesado: 0,
      no_interesado: 0,
      descartado: 0,
    };
    for (const r of rows) base[r.status]++;
    return base;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No hay leads en este lote todavía.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {LEAD_STATUSES.map((s) => (
          <span
            key={s}
            className={`rounded-full border px-3 py-1 font-medium ${STATUS_STYLES[s]}`}
          >
            {STATUS_LABELS[s]}: {stats[s]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Rubro</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((lead) => (
              <tr key={lead.id} className="align-top">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{lead.name}</div>
                  {lead.address ? (
                    <div className="text-xs text-slate-500">{lead.address}</div>
                  ) : null}
                  {lead.mapsUrl ? (
                    <a
                      href={lead.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver en Maps
                    </a>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-600">{lead.category}</td>
                <td className="px-3 py-2 text-slate-600">{lead.searchArea}</td>
                <td className="px-3 py-2 text-slate-600">
                  {lead.phone ? <div>{lead.phone}</div> : null}
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Sitio web
                    </a>
                  ) : null}
                  {!lead.phone && !lead.website ? (
                    <span className="text-xs text-slate-400">Sin datos</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <StatusSelect
                    leadId={lead.id}
                    status={lead.status}
                    onChanged={(status) =>
                      setRows((prev) =>
                        prev.map((r) => (r.id === lead.id ? { ...r, status } : r))
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <NotesCell leadId={lead.id} initialNotes={lead.notes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
