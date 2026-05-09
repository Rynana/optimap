import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useSites } from "../features/sites/use-sites";
import { STATUS_CONFIG, TYPE_LABELS } from "../features/sites/status-config";
import { SITE_STATUSES, SITE_TYPES } from "../features/sites/schema";
import type { SiteStatus, SiteType } from "../features/sites/schema";
import { useDebounce } from "../lib/use-debounce";
import { loadSampleData } from "../features/sites/sample-data";
import { db } from "../db/client";
import type { Site } from "../db/schema";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SiteStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SitesTable({ sites }: { sites: Site[] }) {
  const navigate = useNavigate();

  function handleRowKeyDown(e: React.KeyboardEvent, siteId: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/sites/${siteId}`);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200" role="grid">
        <thead className="bg-slate-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Type
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Address
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Last updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {sites.map((site) => (
            <tr
              key={site.id}
              role="row"
              tabIndex={0}
              data-testid={`site-row-${site.id}`}
              className="cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => navigate(`/sites/${site.id}`)}
              onKeyDown={(e) => handleRowKeyDown(e, site.id)}
              aria-label={`View site ${site.name}`}
            >
              <td className="px-6 py-4 text-sm font-medium text-slate-900">{site.name}</td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {TYPE_LABELS[site.type as SiteType] ?? site.type}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={site.status as SiteStatus} />
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{site.address ?? "—"}</td>
              <td className="px-6 py-4 text-sm text-slate-500">{formatDate(site.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <Loader2 size={24} className="animate-spin" aria-hidden />
      <span className="ml-2 text-sm">Loading sites…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-red-600">
      <AlertTriangle size={20} aria-hidden />
      <p className="text-sm">Failed to load sites: {message}</p>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm text-slate-500">No sites match your filters.</p>
    </div>
  );
}

type EmptyStateProps = {
  onLoadSample: () => Promise<void>;
  loadingSample: boolean;
  csvStubOpen: boolean;
  onToggleCsvStub: () => void;
};

function EmptyState({
  onLoadSample,
  loadingSample,
  csvStubOpen,
  onToggleCsvStub,
}: EmptyStateProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-lg font-semibold text-slate-800">No sites yet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Get started by loading sample data, importing a CSV, or adding your first site.
        </p>
      </div>

      <div className="mt-8 w-full max-w-sm space-y-3">
        <button
          type="button"
          onClick={onLoadSample}
          disabled={loadingSample}
          data-testid="empty-start-sample-btn"
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingSample ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" aria-hidden />
              Loading sample data…
            </>
          ) : (
            "Start with a sample dataset"
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCsvStub}
          data-testid="empty-import-csv-btn"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Import from CSV
        </button>
        {csvStubOpen && (
          <p className="text-center text-sm text-slate-500" role="status">
            CSV import coming in T-019.
          </p>
        )}

        <button
          type="button"
          onClick={() => navigate("/sites/new")}
          data-testid="empty-add-site-btn"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Add your first site
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Sites() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const rawQ = searchParams.get("q") ?? "";
  const statusParam = (searchParams.get("status") ?? "") as SiteStatus | "";
  const typeParam = (searchParams.get("type") ?? "") as SiteType | "";

  const [inputValue, setInputValue] = useState(rawQ);
  const debouncedSearch = useDebounce(inputValue, 300);

  const [loadingSample, setLoadingSample] = useState(false);
  const [csvStubOpen, setCsvStubOpen] = useState(false);

  // Sync debounced search to URL query string.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) {
          next.set("q", debouncedSearch);
        } else {
          next.delete("q");
        }
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const {
    data: sites = [],
    isLoading,
    isError,
    error,
  } = useSites({
    search: debouncedSearch || undefined,
    status: statusParam || undefined,
    type: typeParam || undefined,
    limit: 1000,
  });

  const hasFilters = debouncedSearch !== "" || statusParam !== "" || typeParam !== "";

  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  async function handleLoadSample() {
    setLoadingSample(true);
    try {
      await loadSampleData(db);
      await queryClient.invalidateQueries({ queryKey: ["sites"] });
    } finally {
      setLoadingSample(false);
    }
  }

  const errorMessage =
    error instanceof Error ? error.message : error != null ? String(error) : "Unknown error";

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-slate-900">Sites</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCsvStubOpen((v) => !v)}
            data-testid="import-csv-header-btn"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <Upload size={14} aria-hidden />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => navigate("/sites/new")}
            data-testid="new-site-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus size={14} aria-hidden />
            New site
          </button>
        </div>
      </div>

      {csvStubOpen && (
        <div className="shrink-0 border-b border-slate-200 bg-blue-50 px-6 py-2">
          <p className="text-sm text-blue-700" role="status">
            CSV import coming in T-019.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-3">
        <input
          type="search"
          placeholder="Search sites…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Search sites"
          data-testid="search-input"
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <select
          value={statusParam}
          onChange={(e) => updateParam("status", e.target.value)}
          aria-label="Filter by status"
          data-testid="status-filter"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {SITE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>

        <select
          value={typeParam}
          onChange={(e) => updateParam("type", e.target.value)}
          aria-label="Filter by type"
          data-testid="type-filter"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {SITE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              setSearchParams({});
            }}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message={errorMessage} />}
        {!isLoading && !isError && sites.length === 0 && !hasFilters && (
          <EmptyState
            onLoadSample={handleLoadSample}
            loadingSample={loadingSample}
            csvStubOpen={csvStubOpen}
            onToggleCsvStub={() => setCsvStubOpen((v) => !v)}
          />
        )}
        {!isLoading && !isError && sites.length === 0 && hasFilters && <NoResultsState />}
        {!isLoading && !isError && sites.length > 0 && <SitesTable sites={sites} />}
      </div>
    </div>
  );
}
