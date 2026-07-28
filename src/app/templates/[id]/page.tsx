"use client";

export const runtime = 'edge';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTemplate, Template, deleteTemplate } from "@/lib/api-client";
import { guestGetTemplate, guestDeleteTemplate } from "@/lib/guest-store";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlay, HiOutlineArrowLeft, HiOutlineTemplate } from "react-icons/hi";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const id = params.id as string;

  useEffect(() => {
    if (id.startsWith("guest-")) {
      const tpl = guestGetTemplate(id);
      if (tpl) setTemplate(tpl);
      else toast.error("Template not found");
      setLoading(false);
    } else {
      getTemplate(id).then((data) => setTemplate(data.template))
        .catch(() => toast.error("Template not found"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const isOwner = user?.id === template?.created_by || (isGuest && template?.created_by === "guest");

  const handleDelete = async () => {
    if (!confirm("Delete this template permanently?")) return;
    try {
      if (id.startsWith("guest-")) {
        guestDeleteTemplate(id);
      } else {
        await deleteTemplate(id);
      }
      toast.success("Template deleted"); router.push("/templates");
    } catch { toast.error("Failed to delete"); }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-6 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!template) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">Template not found.</div>;
  }

  const maxRow = Math.max(...template.cells.map((c) => c.row_pos), 0);
  const maxCol = Math.max(...template.cells.map((c) => c.col_pos), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
        <HiOutlineArrowLeft className="w-4 h-4" /> Templates
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{template.name}</h1>
            {template.is_public ? <span className="badge-public">Public</span> : <span className="badge-private">Private</span>}
          </div>
          <p className="text-sm text-slate-500">{template.description || "No description"}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>by {template.creator_name}</span>
            <span>·</span>
            {template.game_icon && <span>{template.game_icon} {template.game_name}</span>}
            <span>·</span>
            <span className="badge-count">{template.cells.length} cells</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <Link href={`/templates/${id}/edit`} className="btn-secondary text-sm">
                <HiOutlinePencil className="w-4 h-4" /> Edit
              </Link>
              <button onClick={handleDelete} className="btn-danger text-sm">
                <HiOutlineTrash className="w-4 h-4" /> Delete
              </button>
            </>
          )}
          <Link href={`/scorecards/new?template=${id}`} className="btn-primary text-sm">
            <HiOutlinePlay className="w-4 h-4" /> Use Template
          </Link>
        </div>
      </div>

      {/* Grid Preview */}
      <div className="card p-6 overflow-x-auto">
        <h3 className="section-header">Layout Preview</h3>
        <div className="grid gap-1.5 min-w-[500px]" style={{
          gridTemplateColumns: `repeat(${maxCol + 1}, minmax(100px, 1fr))`,
        }}>
          {Array.from({ length: maxRow + 1 }, (_, r) =>
            Array.from({ length: maxCol + 1 }, (_, c) => {
              const cell = template.cells.find((cell) => cell.row_pos === r && cell.col_pos === c);
              if (!cell) return <div key={`${r}-${c}`} className="border border-dashed border-slate-200 rounded-lg min-h-[48px]" style={{ gridRow: r + 1, gridColumn: c + 1 }} />;
              return (
                <div key={`${r}-${c}`} className={`rounded-lg p-2.5 min-h-[48px] text-xs border ${
                  cell.cell_type === "heading" ? "bg-indigo-50 border-indigo-200 text-indigo-800 font-bold" :
                  cell.cell_type === "label" ? "bg-slate-50 border-slate-200 text-slate-500 font-medium" :
                  cell.cell_type === "formula" ? "bg-amber-50 border-amber-200 text-amber-800" :
                  cell.cell_type === "tally" ? "bg-violet-50 border-violet-200 text-violet-800" :
                  "bg-white border-slate-200"
                }`} style={{
                  gridRow: `span ${cell.row_span}`,
                  gridColumn: `span ${cell.col_span}`,
                }}>
                  <div className="font-medium truncate">{cell.label || cell.cell_key}</div>
                  <div className="text-[10px] opacity-50 mt-0.5 uppercase tracking-wider">{cell.cell_type}</div>
                  {cell.formula_expr && <div className="text-[10px] font-mono opacity-50 truncate mt-0.5">={cell.formula_expr}</div>}
                  {cell.per_player ? <div className="text-[10px] text-indigo-500 mt-0.5">👤 per player</div> : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
