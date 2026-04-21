import { db } from "./index";
import { contacts, deals, activities, pipelineStages } from "./schema";

console.log("Seeding database...");

const stages = await db.select().from(pipelineStages).orderBy(pipelineStages.order);

if (stages.length === 0) {
  console.error("No pipeline stages found. Run db:push and seed stages first.");
  process.exit(1);
}

const stageMap = new Map(stages.map((s) => [s.name, s.id]));
const now = new Date();
const day = 86400 * 1000;

const contactData = [
  {
    name: "Maria Garcia",
    email: "maria@techstartup.mx",
    phone: "+52 55 1234 5678",
    company: "TechStartup MX",
    source: "website",
    temperature: "hot",
    score: 85,
    notes: "Interesada en plan empresarial. Tiene equipo de 15 personas.",
    createdAt: new Date(now.getTime() - 5 * day),
    updatedAt: new Date(now.getTime() - 1 * day),
  },
  {
    name: "Carlos Rodriguez",
    email: "carlos@inmobiliaria.com",
    phone: "+52 33 9876 5432",
    company: "Inmobiliaria Rodriguez",
    source: "referido",
    temperature: "warm",
    score: 60,
    notes: "Referido por Juan. Busca automatizar seguimiento de clientes.",
    createdAt: new Date(now.getTime() - 10 * day),
    updatedAt: new Date(now.getTime() - 3 * day),
  },
  {
    name: "Ana Martinez",
    email: "ana@consultoria.mx",
    phone: "+52 81 5555 1234",
    company: "Martinez Consultores",
    source: "redes_sociales",
    temperature: "warm",
    score: 55,
    notes: "Nos contacto por LinkedIn. Consultoria de RRHH.",
    createdAt: new Date(now.getTime() - 7 * day),
    updatedAt: new Date(now.getTime() - 2 * day),
  },
  {
    name: "Roberto Sanchez",
    email: "roberto@tienda.com",
    phone: "+52 55 7777 8888",
    company: "Tienda en Linea SA",
    source: "formulario",
    temperature: "cold",
    score: 25,
    notes: "Lleno formulario web. E-commerce de ropa.",
    createdAt: new Date(now.getTime() - 15 * day),
    updatedAt: new Date(now.getTime() - 15 * day),
  },
  {
    name: "Laura Hernandez",
    email: "laura@agencia.mx",
    phone: "+52 33 4444 5555",
    company: "Agencia Creativa",
    source: "evento",
    temperature: "hot",
    score: 90,
    notes: "Conocida en evento de networking. Muy interesada, pidio demo inmediata.",
    createdAt: new Date(now.getTime() - 3 * day),
    updatedAt: now,
  },
];

const insertedContacts = await db.insert(contacts).values(contactData).returning();
console.log(`Created ${insertedContacts.length} contacts`);

const dealData = [
  {
    title: "Plan Empresarial - TechStartup MX",
    value: 250000,
    stageId: stageMap.get("Propuesta") || stages[2].id,
    contactId: insertedContacts[0].id,
    expectedClose: new Date(now.getTime() + 15 * day),
    probability: 70,
    notes: "Enviamos propuesta. Esperando respuesta del director.",
    createdAt: new Date(now.getTime() - 4 * day),
    updatedAt: new Date(now.getTime() - 1 * day),
  },
  {
    title: "CRM Personalizado - Inmobiliaria",
    value: 180000,
    stageId: stageMap.get("Contactado") || stages[1].id,
    contactId: insertedContacts[1].id,
    expectedClose: new Date(now.getTime() + 30 * day),
    probability: 40,
    notes: "Primera llamada realizada. Agendamos demo para la proxima semana.",
    createdAt: new Date(now.getTime() - 8 * day),
    updatedAt: new Date(now.getTime() - 3 * day),
  },
  {
    title: "Servicio Premium - Agencia Creativa",
    value: 450000,
    stageId: stageMap.get("Negociacion") || stages[3].id,
    contactId: insertedContacts[4].id,
    expectedClose: new Date(now.getTime() + 7 * day),
    probability: 85,
    notes: "Negociando precio. Muy probable que cierre esta semana.",
    createdAt: new Date(now.getTime() - 2 * day),
    updatedAt: now,
  },
];

const insertedDeals = await db.insert(deals).values(dealData).returning();
console.log(`Created ${insertedDeals.length} deals`);

const activityData = [
  {
    type: "email",
    description: "Envio de propuesta comercial con pricing y features del plan empresarial.",
    contactId: insertedContacts[0].id,
    dealId: insertedDeals[0].id,
    completedAt: new Date(now.getTime() - 2 * day),
    createdAt: new Date(now.getTime() - 2 * day),
  },
  {
    type: "call",
    description: "Llamada de introduccion. Carlos mostro interes en automatizar su proceso.",
    contactId: insertedContacts[1].id,
    dealId: insertedDeals[1].id,
    completedAt: new Date(now.getTime() - 5 * day),
    createdAt: new Date(now.getTime() - 5 * day),
  },
  {
    type: "meeting",
    description: "Reunion presencial en evento de networking. Intercambiamos tarjetas.",
    contactId: insertedContacts[4].id,
    dealId: insertedDeals[2].id,
    completedAt: new Date(now.getTime() - 3 * day),
    createdAt: new Date(now.getTime() - 3 * day),
  },
  {
    type: "follow_up",
    description: "Dar seguimiento a Maria sobre la propuesta enviada. Preguntar si tiene dudas.",
    contactId: insertedContacts[0].id,
    dealId: insertedDeals[0].id,
    scheduledAt: new Date(now.getTime() + 1 * day),
    createdAt: now,
  },
  {
    type: "follow_up",
    description: "Agendar demo con Carlos para mostrar el CRM personalizado.",
    contactId: insertedContacts[1].id,
    dealId: insertedDeals[1].id,
    scheduledAt: new Date(now.getTime() + 3 * day),
    createdAt: now,
  },
  {
    type: "note",
    description: "Roberto parece no estar listo para comprar. Agregar a newsletter y dar seguimiento en 30 dias.",
    contactId: insertedContacts[3].id,
    completedAt: new Date(now.getTime() - 10 * day),
    createdAt: new Date(now.getTime() - 10 * day),
  },
];

const insertedActivities = await db.insert(activities).values(activityData).returning();
console.log(`Created ${insertedActivities.length} activities`);
console.log("Seed complete!");

process.exit(0);
