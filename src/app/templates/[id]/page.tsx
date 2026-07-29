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

  const sortedCells = [...template.cells].sort((a, b) => a.sort_order - b.sort_order);

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
            <HiOutlinePlay className="w-4 h-4" /> Use Scorecard
          </Link>
        </div>
      </div>

      {/* Table Preview */}
      <div className="card p-6 overflow-x-auto">
        <h3 className="section-header">Layout Preview</h3>
        <table className="w-full min-w-[400px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 text-left">Score Category</th>
              <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 text-center">Player 1</th>
              <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 text-center">Player 2</th>
            </tr>
          </thead>
          <tbody>
            {sortedCells.map((cell, idx) => (
              <tr key={cell.id || cell.cell_key} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-slate-50/30" : ""}`}>
                {cell.cell_type === "heading" ? (
                  <td colSpan={3} className="px-4 py-2.5 font-bold text-sm text-indigo-800 bg-indigo-50/30">
                    {cell.label || cell.cell_key}
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-slate-700">{cell.label || cell.cell_key}</div>
                      {cell.formula_expr && <div className="text-[10px] font-mono text-amber-600 mt-0.5">={cell.formula_expr}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs ${
                        cell.cell_type === "formula" ? "font-mono text-amber-400" :
                        cell.cell_type === "tally" ? "text-slate-300" :
                        cell.cell_type === "input:text" ? "text-slate-300" : "text-slate-300"
                      }`}>
                        {cell.cell_type === "tally" ? "− 0 +" :
                         cell.cell_type === "formula" ? "0" :
                         cell.cell_type === "input:text" ? "text" : "0"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs ${
                        cell.cell_type === "formula" ? "font-mono text-amber-400" :
                        cell.cell_type === "tally" ? "text-slate-300" :
                        cell.cell_type === "input:text" ? "text-slate-300" : "text-slate-300"
                      }`}>
                        {cell.cell_type === "tally" ? "− 0 +" :
                         cell.cell_type === "formula" ? "0" :
                         cell.cell_type === "input:text" ? "text" : "0"}
                      </span>
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
