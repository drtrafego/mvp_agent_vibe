import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(activities).where(eq(activities.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.completedAt !== undefined) {
      if (body.completedAt === null || body.completedAt === true) {
        updateData.completedAt = new Date();
      } else if (typeof body.completedAt === "string") {
        const parsed = new Date(body.completedAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "completedAt deve ser uma data valida" }, { status: 400 });
        }
        updateData.completedAt = parsed;
      }
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string" || !body.description.trim()) {
        return NextResponse.json({ error: "description deve ser um texto nao vazio" }, { status: 400 });
      }
      updateData.description = body.description;
    }

    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt === null) {
        updateData.scheduledAt = null;
      } else if (typeof body.scheduledAt === "string") {
        const parsed = new Date(body.scheduledAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "scheduledAt deve ser uma data valida" }, { status: 400 });
        }
        updateData.scheduledAt = parsed;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nao ha campos para atualizar" }, { status: 400 });
    }

    const [result] = await db.update(activities).set(updateData).where(eq(activities.id, id)).returning();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Error ao atualizar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [existing] = await db.select().from(activities).where(eq(activities.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }

    await db.delete(activities).where(eq(activities.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Error ao eliminar: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
