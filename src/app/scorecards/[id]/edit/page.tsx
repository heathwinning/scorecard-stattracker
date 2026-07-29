"use client";

export const runtime = 'edge';

import TemplateNewPage from "../../new/page";

export default function TemplateEditPage({ params }: { params: { id: string } }) {
  return <TemplateNewPage params={params} />;
}
