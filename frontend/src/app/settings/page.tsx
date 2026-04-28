"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Kanban,
  Terminal,
  Zap,
  Webhook,
  Bell,
  Copy,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotificationToggle } from "@/components/shared/NotificationToggle";
import type { CrmConfig } from "@/types";

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export default function SettingsPage() {
  const [config, setConfig] = useState<CrmConfig | null>(null);
  const [stages, setStages] = useState<
    Array<{ id: string; name: string; color: string; order: number }>
  >([]);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch("/crm-config.json")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});

    fetch("/api/pipeline")
      .then((r) => r.json())
      .then(setStages);
  }, []);

  const commands = [
    {
      name: "/setup",
      description: "Configurar o CRM para seu negócio",
    },
    {
      name: "/add-lead",
      description: "Adicionar um lead de forma conversacional",
    },
    {
      name: "/analyze-pipeline",
      description: "Analisar pipeline e obter recomendações",
    },
    {
      name: "/daily-briefing",
      description: "Resumo diário de vendas",
    },
    {
      name: "/import-contacts",
      description: "Importar contatos de CSV",
    },
    {
      name: "/customize",
      description: "Personalizar seu CRM",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Configurações do CRM e comandos disponíveis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Escolha entre tema claro, escuro ou seguir a preferência do sistema.
            </p>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex-1 flex flex-col gap-1.5 h-auto py-3 cursor-pointer",
                    theme === value && "border-primary bg-primary/5 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Business config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {config ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="capitalize">{config.business.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Indústria</span>
                  <span className="capitalize">{config.business.industry}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Equipe</span>
                  <span>{config.business.teamSize}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Idioma</span>
                  <span>
                    {config.preferences.language === "es" ? "Espanhol" : config.preferences.language === "pt" ? "Português" : "Inglês"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tema</span>
                  <span className="capitalize">{config.preferences.theme}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Execute <code>/setup</code> no Claude Code para configurar seu negócio.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline stages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Etapas do Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm flex-1">{stage.name}</span>
                  <Badge variant="outline" className="text-xs">
                    #{stage.order}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Use <code>/customize</code> no Claude Code para modificar as etapas.
            </p>
          </CardContent>
        </Card>

        {/* Webhook config */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Receba leads automaticamente de formulários, landing pages ou qualquer ferramenta que suporte webhooks.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted p-2 rounded font-mono truncate">
                  POST {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhook
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/api/webhook`
                    );
                    toast.success("URL copiada");
                  }}
                  className="p-2 rounded hover:bg-muted cursor-pointer"
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-xs font-mono">
                <p className="text-muted-foreground mb-1">Exemplo:</p>
                <p>curl -X POST {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhook \</p>
                <p className="pl-4">-H &quot;Content-Type: application/json&quot; \</p>
                <p className="pl-4">-d &apos;{`{"name":"João","email":"j@test.com","phone":"11912345678"}`}&apos;</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Suporta campos em português e inglês: name/nome, email/correo, phone/telefone, company/empresa, notes/notas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NotificationToggle />
            <p className="text-xs text-muted-foreground">
              As notificações avisam quando há acompanhamentos vencidos. São verificadas a cada 5 minutos enquanto o CRM estiver aberto.
            </p>
          </CardContent>
        </Card>

        {/* Claude Code commands */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Comandos do Claude Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Estes comandos estão disponíveis quando você abre o projeto no Claude Code. Digite o comando diretamente no terminal do Claude Code.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commands.map((cmd) => (
                <div
                  key={cmd.name}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <code className="text-sm font-semibold">{cmd.name}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cmd.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
