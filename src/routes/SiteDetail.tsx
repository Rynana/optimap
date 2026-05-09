import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <Link
        to="/sites"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} aria-hidden />
        Back to sites
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Site detail</h1>
      <p className="mt-2 text-sm text-slate-500">
        Full site detail page coming in T-008.{" "}
        <span className="font-mono text-xs text-slate-400">{id}</span>
      </p>
    </div>
  );
}
