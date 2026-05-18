"use client";
import React, { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Printer, Save, Trash2 } from "lucide-react";

import { EventRequestForm } from "./EventRequestForm";
import { ProspectInvitationForm } from "./ProspectInvitationForm";
import { SpecialCompanyEventsForm } from "./SpecialCompanyEventsForm";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EventFormTab = "special" | "request" | "prospect";

type FormActions = {
  save?: () => void;
  load?: () => void;
  clear?: () => void;
  print?: () => void;
};

const activeTabStorageKey = "eventForms.activeTab";
const tabs: { key: EventFormTab; label: string }[] = [
  { key: "special", label: "Special Company Events" },
  { key: "request", label: "Event Request" },
  { key: "prospect", label: "Prospect Invitation" },
];

const isEventFormTab = (value: string | null): value is EventFormTab =>
  value === "special" || value === "request" || value === "prospect";

const getInitialTab = (queryTab: string | null): EventFormTab => {
  if (isEventFormTab(queryTab)) return queryTab;
  if (typeof window === "undefined") return "request";
  const saved = localStorage.getItem(activeTabStorageKey);
  if (isEventFormTab(saved)) return saved;
  return "request";
};

export function EventFormsHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<EventFormTab>(() =>
    getInitialTab(searchParams.get("tab")),
  );
  const actionsRef = useRef<Record<EventFormTab, FormActions>>({
    special: {},
    request: {},
    prospect: {},
  });

  const handleTabChange = (value: string) => {
    if (!isEventFormTab(value)) return;
    setActiveTab(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(activeTabStorageKey, value);
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", value);
    router.replace(`?${next.toString()}`);
  };

  const registerSpecialActions = useCallback((actions: FormActions) => {
    actionsRef.current.special = actions;
  }, []);
  const registerRequestActions = useCallback((actions: FormActions) => {
    actionsRef.current.request = actions;
  }, []);
  const registerProspectActions = useCallback((actions: FormActions) => {
    actionsRef.current.prospect = actions;
  }, []);

  const runAction = (key: keyof FormActions) => {
    const actions = actionsRef.current[activeTab];
    actions?.[key]?.();
  };

  const Toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => runAction("save")}
        aria-label="Save active form"
      >
        <Save data-icon="inline-start" />
        Save
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => runAction("load")}
        aria-label="Load active form"
      >
        <Download data-icon="inline-start" />
        Load
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => runAction("clear")}
        aria-label="Clear active form"
      >
        <Trash2 data-icon="inline-start" />
        Clear
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => runAction("print")}
        aria-label="Print active form"
      >
        <Printer data-icon="inline-start" />
        Print
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event Forms</h1>
          <p className="text-sm text-muted-foreground">
            Choose, complete, save, and print event request documents.
          </p>
        </div>
        {Toolbar}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="no-print flex flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="special" className="mt-6">
          {activeTab === "special" && (
            <SpecialCompanyEventsForm
              embedded
              showBackButton={false}
              showToolbar={false}
              showPrintRoot
              showActions={false}
              onRegisterActions={registerSpecialActions}
            />
          )}
        </TabsContent>
        <TabsContent value="request" className="mt-6">
          {activeTab === "request" && (
            <EventRequestForm
              embedded
              showBackButton={false}
              showToolbar={false}
              showPrintRoot
              showActions={false}
              onRegisterActions={registerRequestActions}
            />
          )}
        </TabsContent>
        <TabsContent value="prospect" className="mt-6">
          {activeTab === "prospect" && (
            <ProspectInvitationForm
              embedded
              showBackButton={false}
              showToolbar={false}
              showPrintRoot
              showActions={false}
              onRegisterActions={registerProspectActions}
            />
          )}
        </TabsContent>
      </Tabs>

      <Separator className="no-print" />

      {/* Footer */}
      <Card className="no-print">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          {Toolbar}
          <p className="text-xs text-muted-foreground">
            Disable Headers and Footers in the print dialog for best results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
