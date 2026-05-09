import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SiteNew() {
  return (
    <div className="p-6">
      <Link
        to="/sites"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} aria-hidden />
        Back to sites
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">New site</h1>
      <p className="mt-2 text-sm text-slate-500">Site create form coming in T-007.</p>
    </div>
  );
}
