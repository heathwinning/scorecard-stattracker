"use client";

export const runtime = 'edge';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTemplate, Template, deleteTemplate, type TemplateCell } from "@/lib/api-client";
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

  const sortedCells = [...template.cells]
    .filter(c => (c.cell_type as string) !== "label") // skip legacy grid labels
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
        <HiOutlineArrowLeft className="w-4 h-4" /> Scorecards
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
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
          {isOwner ? (
            <>
              <Link href={`/templates/${id}/edit`} className="btn-secondary text-sm">
                <HiOutlinePencil className="w-4 h-4" /> Edit
              </Link>
              <button onClick={handleDelete} className="btn-danger text-sm">
                <HiOutlineTrash className="w-4 h-4" /> Delete
              </button>
            </>
          ) : (
            <Link href={`/templates/new?fork=${id}`} className="btn-secondary text-sm">
              <HiOutlinePencil className="w-4 h-4" /> Copy & Edit
            </Link>
          )}
          <Link href={`/scorecards/new?template=${id}`} className="btn-primary text-sm">
            <HiOutlinePlay className="w-4 h-4" /> Use Scorecard
          </Link>
        </div>
      </div>

      {/* Table Preview */}
      <div className="card p-4 overflow-x-auto">
        <h3 className="section-header">Layout Preview</h3>
        <table className="w-full min-w-[400px] border-collapse table-auto">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5 text-left">Category</th>
              <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5 text-center">P1</th>
              <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5 text-center">P2</th>
            </tr>
          </thead>
          <tbody>
            {sortedCells.map((cell, idx) => (
              <tr key={cell.id || cell.cell_key} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-slate-50/40" : ""}`}>
                {cell.cell_type === "heading" ? (
                  <td colSpan={3} className="px-2 py-1 font-semibold text-[13px] text-indigo-700 bg-indigo-50/40">
                    {cell.label || cell.cell_key}
                  </td>
                ) : (
                  <>
                    <td className="px-2 py-1">
                      <span className="text-[13px] font-medium text-slate-700 truncate"
                        title={(() => {
                          const parts = [cell.label || cell.cell_key.replace(/_/g, ' ')];
                          if (cell.formula_expr) parts.push(`Formula: ${cell.formula_expr}`);
                          if (!!(cell.config_json as Record<string, unknown>)?.allow_multiple) parts.push('Players can add multiple entries');
                          return parts.join('\n');
                        })()}>
                        {cell.label || cell.cell_key.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <PreviewValue cell={cell} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <PreviewValue cell={cell} />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewValue({ cell }: { cell: TemplateCell }) {
  const allowMultiple = !!(cell.config_json as Record<string, unknown>)?.allow_multiple;
  if (allowMultiple) return <span className="text-[11px] text-slate-300" title="Variable entries">…</span>;
  if (cell.cell_type === "formula") return <span className="text-[11px] text-slate-300">0</span>;
  if (cell.cell_type === "tally") return <span className="text-[11px] text-slate-300">−0+</span>;
  if (cell.cell_type === "input:text") return <span className="text-[11px] text-slate-300">abc</span>;
  return <span className="text-[11px] text-slate-300">0</span>;
}
