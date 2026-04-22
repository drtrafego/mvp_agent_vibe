"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

function getInitialState() {
  if (typeof window === "undefined") return { supported: false, enabled: false };
  if (!("Notification" in window)) return { supported: false, enabled: false };
  return {
    supported: true,
    enabled: localStorage.getItem("crm-notifications") === "true",
  };
}

export function NotificationToggle() {
  const initial = getInitialState();
  const [enabled, setEnabled] = useState(initial.enabled);
  const supported = initial.supported;

  const toggle = async () => {
    if (!supported) {
      toast.error("Seu navegador não suporta notificações");
      return;
    }

    if (!enabled) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem("crm-notifications", "true");
        setEnabled(true);
        toast.success("Notificações ativadas");

        new Notification("Auto-CRM", {
          body: "As notificações estão ativas. Você será avisado sobre acompanhamentos pendentes.",
        });
      } else {
        toast.error("Permissão de notificações negada");
      }
    } else {
      localStorage.setItem("crm-notifications", "false");
      setEnabled(false);
      toast.success("Notificações desativadas");
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        {enabled ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            Notificações do navegador
          </p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? "Você receberá alertas de acompanhamentos vencidos"
              : "Ative para receber alertas de acompanhamentos"}
          </p>
        </div>
      </div>
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={toggle}
        className="cursor-pointer"
      >
        {enabled ? "Desativar" : "Ativar"}
      </Button>
    </div>
  );
}
