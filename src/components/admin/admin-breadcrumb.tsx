"use client";

import { ChevronRight } from "lucide-react";

import { useSectionLabel } from "@/components/admin/admin-sidebar";

export function AdminBreadcrumb() {
  const section = useSectionLabel();

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span>Store control</span>
      <ChevronRight className="size-3" />
      <span className="text-foreground">{section}</span>
    </nav>
  );
}
