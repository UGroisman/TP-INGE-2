"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Job { id: string; topic: string; kind: string; status: string; error: string | null; study_set_id: string | null }

export function GenerationJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string[]>([]);
  const dismissedIds = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/generation-jobs", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (active) { setJobs(result.jobs.filter((job: Job) => !dismissedIds.current.has(job.id))); setError(false); }
        if (result.jobs.some((job: Job) => job.status === "queued" || job.status === "processing")) {
          const wakeUrl = process.env.NEXT_PUBLIC_WORKER_WAKE_URL;
          if (wakeUrl) void fetch(wakeUrl, { mode: "no-cors", cache: "no-store" }).catch(() => undefined);
        }
      } catch { if (active) setError(true); }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function dismiss(job: Job, destination?: string) {
    if (dismissing.includes(job.id)) return;
    setDismissError(null);
    setDismissing((current) => [...current, job.id]);
    try {
      const response = await fetch("/api/generation-jobs", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }), keepalive: true,
      });
      if (!response.ok) throw new Error();
      dismissedIds.current.add(job.id);
      setJobs((current) => current.filter((item) => item.id !== job.id));
      if (destination) router.push(destination);
    } catch {
      setDismissError("No pudimos cerrar el aviso. Intentá nuevamente.");
    } finally {
      setDismissing((current) => current.filter((id) => id !== job.id));
    }
  }

  if (!jobs.length && !error) return null;
  return <section className="rounded-xl border border-teal-200 bg-white p-6 shadow-sm" aria-live="polite">
    <h2 className="text-xl font-semibold">Generaciones recientes</h2>
    {error ? <p className="mt-3 text-sm text-red-700">No pudimos actualizar los estados.</p> : null}
    {dismissError ? <p role="alert" className="mt-3 text-sm text-red-700">{dismissError}</p> : null}
    <ul className="mt-4 space-y-3">{jobs.map((job) => <li key={job.id} className="flex items-center justify-between gap-3 rounded-md bg-teal-50 p-3 text-sm">
      <div>
      <strong>{job.topic}</strong>{" · "}{job.kind === "flashcards" ? "Flashcards" : "Opción múltiple"}{" · "}
      {job.status === "queued" ? "En cola" : job.status === "processing" ? "Generando" : job.status === "ready" ? "Listo" : "Falló"}
      {job.error ? <span> · {job.error}</span> : null}
      {job.status === "ready" && job.study_set_id ? <> · <Link className="font-semibold underline" href={`/study-sets/${job.study_set_id}`} onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { void dismiss(job); return; }
        event.preventDefault();
        void dismiss(job, `/study-sets/${job.study_set_id}`);
      }}>Abrir set</Link></> : null}
      </div>
      {job.status === "ready" || job.status === "failed" ? <button type="button" aria-label={`Cerrar aviso de ${job.topic}`} title="Cerrar aviso" disabled={dismissing.includes(job.id)} onClick={() => void dismiss(job)} className="rounded-md px-2 py-1 text-lg font-semibold text-teal-900 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50">×</button> : null}
    </li>)}</ul>
  </section>;
}
