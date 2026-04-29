"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Trash2, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface RagDoc {
  id: number;
  content: string;
  metadata: Record<string, unknown> | null;
}

function DocCard({ doc, onDelete }: { doc: RagDoc; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const preview = doc.content.length > 300 ? doc.content.slice(0, 300) + "…" : doc.content;
  const canExpand = doc.content.length > 300;

  const handleDelete = async () => {
    if (!confirm("Remover este documento da base RAG?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/rag?id=${doc.id}`, { method: "DELETE" });
      onDelete(doc.id);
    } finally {
      setDeleting(false);
    }
  };

  const source = doc.metadata?.source as string | undefined;
  const title = doc.metadata?.title as string | undefined;

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground font-mono">#{doc.id}</span>
          {(title || source) && (
            <span className="text-xs text-foreground/70 truncate">
              {title || source}
            </span>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Remover documento"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
        {expanded ? doc.content : preview}
      </p>

      {canExpand && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Ver menos" : "Ver tudo"}
        </button>
      )}

      {doc.metadata && Object.keys(doc.metadata).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(doc.metadata).map(([k, v]) => (
            <span
              key={k}
              className="text-[11px] bg-muted text-muted-foreground rounded-md px-2 py-0.5"
            >
              {k}: {String(v)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RagPage() {
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const fetchDocs = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rag${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs(query);
  }, [query, fetchDocs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  const handleDelete = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Base de Conhecimento RAG</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Documentos usados pelo agente para responder sobre nichos, preços e objeções
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no conteúdo dos documentos..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setSearch(""); setQuery(""); }}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Limpar
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Carregando documentos...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {query ? "Nenhum documento encontrado para essa busca." : "Nenhum documento na base RAG."}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {docs.length} documento{docs.length !== 1 ? "s" : ""}
            {query ? ` para "${query}"` : ""}
          </p>
          <div className="grid gap-3">
            {docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
