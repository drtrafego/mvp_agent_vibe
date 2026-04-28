"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Temperature } from "@/types";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nicho: string | null;
  temperature: string;
  score: number;
}

interface Column {
  id: string;
  label: string;
  color: string;
  contacts: Lead[];
}

interface LeadPipelineBoardProps {
  initialColumns: Column[];
}

export function LeadPipelineBoard({ initialColumns }: LeadPipelineBoardProps) {
  const [columns] = useState(initialColumns);
  const router = useRouter();

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.id} className="flex-none w-64">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
            <span className="font-semibold text-sm">{col.label}</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {col.contacts.length}
            </Badge>
          </div>
          <div className="space-y-2 min-h-[200px]">
            {col.contacts.map((lead) => (
              <Card
                key={lead.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/contacts/${lead.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight truncate">{lead.name}</p>
                  <StatusBadge temperature={lead.temperature as Temperature} />
                </div>
                {lead.nicho && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{lead.nicho}</p>
                )}
                {lead.phone && (
                  <p className="text-xs text-muted-foreground mt-1">{lead.phone}</p>
                )}
                {lead.email && (
                  <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                )}
                <div className="mt-2 flex items-center gap-1">
                  <div className="h-1 flex-1 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded bg-primary transition-all"
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{lead.score}</span>
                </div>
              </Card>
            ))}
            {col.contacts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Vazio</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
