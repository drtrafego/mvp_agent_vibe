import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";

  try {
    const rows = search
      ? await db.execute(sql`
          SELECT id, content, metadata
          FROM documents
          WHERE content ILIKE ${"%" + search + "%"}
          ORDER BY id ASC
          LIMIT 200
        `)
      : await db.execute(sql`
          SELECT id, content, metadata
          FROM documents
          ORDER BY id ASC
          LIMIT 200
        `);

    return NextResponse.json(Array.from(rows));
  } catch (err) {
    console.error("GET /api/rag error:", err);
    return NextResponse.json({ error: "Erro ao buscar documentos RAG" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  try {
    await db.execute(sql`DELETE FROM documents WHERE id = ${Number(id)}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/rag error:", err);
    return NextResponse.json({ error: "Erro ao remover documento" }, { status: 500 });
  }
}
