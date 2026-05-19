"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { notify } from "@/lib/notify";

import { createPcfTransaction } from "@/services/pcf.service";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";

type NewPcfDraft = {
  date: string;
  pcvNo: string;
  payee: string;
  invoiceNo: string;
  description: string;
  amountIn: string;
  amountOut: string;
};

const draftStorageKey = "pcf.newEntryDraft";

const initialDraft: NewPcfDraft = {
  date: "",
  pcvNo: "",
  payee: "",
  invoiceNo: "",
  description: "",
  amountIn: "",
  amountOut: "",
};

const normalizeDraft = (value: unknown): NewPcfDraft => {
  if (!value || typeof value !== "object") return initialDraft;
  const parsed = value as Partial<NewPcfDraft>;
  return {
    date: typeof parsed.date === "string" ? parsed.date : "",
    pcvNo: typeof parsed.pcvNo === "string" ? parsed.pcvNo : "",
    payee: typeof parsed.payee === "string" ? parsed.payee : "",
    invoiceNo: typeof parsed.invoiceNo === "string" ? parsed.invoiceNo : "",
    description: typeof parsed.description === "string" ? parsed.description : "",
    amountIn: typeof parsed.amountIn === "string" ? parsed.amountIn : "",
    amountOut: typeof parsed.amountOut === "string" ? parsed.amountOut : "",
  };
};

const loadDraft = (): NewPcfDraft => {
  if (typeof window === "undefined") return initialDraft;
  try {
    const savedDraft = window.sessionStorage.getItem(draftStorageKey);
    if (!savedDraft) return initialDraft;
    return normalizeDraft(JSON.parse(savedDraft));
  } catch {
    return initialDraft;
  }
};

export function NewPcfPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<NewPcfDraft>(loadDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "New PCV Entry | GuildLedger";
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft]);

  const updateDraftField = (field: keyof NewPcfDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    window.sessionStorage.removeItem(draftStorageKey);
    router.push("/pcf");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const result = await createPcfTransaction({
        date: draft.date,
        pcv_number: draft.pcvNo,
        payee: draft.payee,
        invoice_no: draft.invoiceNo,
        description: draft.description,
        amount_in: Number(draft.amountIn || 0),
        amount_out: Number(draft.amountOut || 0),
      });

      if (result.error || !result.data) {
        setErrorMessage(result.error || "Failed to save petty cash transaction.");
        return;
      }

      window.sessionStorage.removeItem(draftStorageKey);
      notify(Save, "PCV saved.");
      router.push("/pcf");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/pcf">Petty Cash Fund</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New PCV Entry</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New PCV Entry</h1>
          <p className="text-sm text-muted-foreground">
            Create a new petty cash voucher entry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Cannot save PCV</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Voucher Reference */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Voucher Reference</h2>
          <p className="text-muted-foreground text-sm">
            When the voucher is for, and its identifying numbers.
          </p>
        </div>
        <FieldGroup className="md:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <DatePicker
                id="date"
                value={draft.date}
                onChange={(value) => updateDraftField("date", value)}
                placeholder="Pick a date"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pcvNo">PCV No.</FieldLabel>
              <Input
                id="pcvNo"
                value={draft.pcvNo}
                onChange={(e) => updateDraftField("pcvNo", e.target.value)}
                placeholder="Enter PCV number"
              />
              <FieldDescription>Leave blank to auto-generate on save.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="payee">Payee</FieldLabel>
              <Input
                id="payee"
                value={draft.payee}
                onChange={(e) => updateDraftField("payee", e.target.value)}
                placeholder="Enter payee"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="invoiceNo">Invoice No.</FieldLabel>
              <Input
                id="invoiceNo"
                value={draft.invoiceNo}
                onChange={(e) => updateDraftField("invoiceNo", e.target.value)}
                placeholder="Enter invoice number"
              />
            </Field>
          </div>
        </FieldGroup>
      </div>

      <Separator className="my-10" />

      {/* Description */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Description</h2>
          <p className="text-muted-foreground text-sm">
            What the voucher is for — visible in reports and audit trail.
          </p>
        </div>
        <FieldGroup className="md:col-span-2">
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => updateDraftField("description", e.target.value)}
              rows={4}
              placeholder="Enter description"
            />
          </Field>
        </FieldGroup>
      </div>

      <Separator className="my-10" />

      {/* Amounts */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Amounts</h2>
          <p className="text-muted-foreground text-sm">
            Cash in vs. cash out. Fill one or the other depending on transaction type.
          </p>
        </div>
        <FieldGroup className="md:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="amountIn">Amount In</FieldLabel>
              <InputGroup>
                <InputGroupAddon>₱</InputGroupAddon>
                <InputGroupInput
                  id="amountIn"
                  type="number"
                  step="0.01"
                  value={draft.amountIn}
                  onChange={(e) => updateDraftField("amountIn", e.target.value)}
                  placeholder="0.00"
                  className="text-right tabular-nums"
                />
              </InputGroup>
              <FieldDescription>Replenishment or starting balance.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="amountOut">Amount Out</FieldLabel>
              <InputGroup>
                <InputGroupAddon>₱</InputGroupAddon>
                <InputGroupInput
                  id="amountOut"
                  type="number"
                  step="0.01"
                  value={draft.amountOut}
                  onChange={(e) => updateDraftField("amountOut", e.target.value)}
                  placeholder="0.00"
                  className="text-right tabular-nums"
                />
              </InputGroup>
              <FieldDescription>Expense paid from the fund.</FieldDescription>
            </Field>
          </div>
        </FieldGroup>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
