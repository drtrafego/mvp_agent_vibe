import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineStages, deals, contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
  const allDeals = await db.select({
    id: deals.id, title: deals.title, value: deals.value, stageId: deals.stageId,
    contactId: deals.contactId, expectedClose: deals.expectedClose,
    probability: deals.probability, notes: deals.notes,
    createdAt: deals.createdAt, updatedAt: deals.updatedAt,
    contactName: contacts.name, contactTemperature: contacts.temperature,
  }).from(deals).leftJoin(contacts, eq(deals.contactId, contacts.id));

  const pipeline = stages.map((stage) => ({ ...stage, deals: allDeals.filter((d) => d.stageId === stage.id) }));
  return NextResponse.json(pipeline);
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (body.dealId && body.stageId) {
    const [existing] = await db.select().from(deals).where(eq(deals.id, body.dealId));
    if (!existing) {
      return NextResponse.json({ error: "Deal nao encontrado" }, { status: 404 });
    }
    const [result] = await db.update(deals).set({ stageId: body.stageId, updatedAt: new Date() }).where(eq(deals.id, body.dealId)).returning();
    return NextResponse.json(result);
  }

  if (body.stages && Array.isArray(body.stages)) {
    const existingDeals = await db.select().from(deals);
    if (existingDeals.length > 0) {
      return NextResponse.json({ error: "Nao se podem reemplazar etapas quando ha deals ativos. Elimina os deals primero." }, { status: 400 });
    }

    await db.delete(pipelineStages);
    for (const stage of body.stages) {
      await db.insert(pipelineStages).values({
        name: stage.name, order: stage.order,
        color: stage.color || "#64748b", isWon: stage.isWon || false, isLost: stage.isLost || false,
      });
    }

    const updated = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Request invalido" }, { status: 400 });
}
