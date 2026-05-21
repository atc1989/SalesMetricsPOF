"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { notify } from "@/lib/notify";

import {
  getPcfTransactionById,
  updatePcfTransaction,
} from "@/services/pcf.service";
import type { PcfTransaction } from "@/types/billing";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type EditPcfDraft = {
  date: string;
  pcvNo: string;
  payee: string;
  invoiceNo: string;
  description: string;
  amountIn: string;
  amountOut: string;
};

const emptyDraft: EditPcfDraft = {
  date: "",
  pcvNo: "",
  payee: "",
  invoiceNo: "",
  description: "",
  amountIn: "",
  amountOut: "",
};

const getDraftStorageKey = (id: string) => `pcf.editEntryDraft.${id}`;

const normalizeDraft = (value: unknown): EditPcfDraft => {
  if (!value || typeof value !== "object") return emptyDraft;
  const parsed = value as Partial<EditPcfDraft>;
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

const mapTransactionToDraft = (transaction: PcfTransaction): EditPcfDraft => ({
  date: transaction.date ?? "",
  pcvNo: transaction.pcv_number ?? "",
  payee: transaction.payee ?? "",
  invoiceNo: transaction.invoice_no ?? "",
  description: transaction.description ?? "",
  amountIn: Number(transaction.amount_in ?? 0) > 0 ? String(transaction.amount_in) : "",
  amountOut: Number(transaction.amount_out ?? 0) > 0 ? String(transaction.amount_out) : "",
});

export function EditPcfPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const router = useRouter();
  const [draft, setDraft] = useState<EditPcfDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedTransaction, setLoadedTransaction] = useState<PcfTransaction | null>(null);

  const draftStorageKey = useMemo(
    () => (id ? getDraftStorageKey(id) : null),
    [id],
  );

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setIsLoading(false);
      setErrorMessage("PCV not found.");
      return;
    }

    setIsLoading(true);
    getPcfTransactionById(id)
      .then((result) => {
        if (!isMounted) return;
        if (result.error || !result.data) {
          setLoadedTransaction(null);
          setErrorMessage(result.error || "PCV not found.");
          return;
        }
        setLoadedTransaction(result.data);
        setErrorMessage(null);
        const savedDraft = draftStorageKey
          ? window.sessionStorage.getItem(draftStorageKey)
          : null;
        if (savedDraft) {
          setDraft(normalizeDraft(JSON.parse(savedDraft)));
          return;
        }
        setDraft(mapTransactionToDraft(result.data));
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadedTransaction(null);
        setErrorMessage(error.message || "Failed to load petty cash transaction.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [draftStorageKey, id]);

  useEffect(() => {
    document.title = loadedTransaction?.pcv_number
      ? `Edit ${loadedTransaction.pcv_number} | GuildLedger`
      : "Edit PCV | GuildLedger";
  }, [loadedTransaction?.pcv_number]);

  useEffect(() => {
    if (!draftStorageKey || !loadedTransaction) return;
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, draftStorageKey, loadedTransaction]);

  const updateDraftField = (field: keyof EditPcfDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (draftStorageKey) window.sessionStorage.removeItem(draftStorageKey);
    if (id) router.push(`/pcf/${id}`);
    else router.push("/pcf");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      setErrorMessage("PCV not found.");
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    try {
      const result = await updatePcfTransaction(id, {
        date: draft.date,
        pcv_number: draft.pcvNo,
        payee: draft.payee,
        invoice_no: draft.invoiceNo,
        description: draft.description,
        amount_in: Number(draft.amountIn || 0),
        amount_out: Number(draft.amountOut || 0),
      });
      if (result.error || !result.data) {
        setErrorMessage(result.error || "Failed to update petty cash transaction.");
        return;
      }
      if (draftStorageKey) window.sessionStorage.removeItem(draftStorageKey);
      notify(CheckCircle2, "PCV updated.");
      router.push(`/pcf/${id}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-80" />
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage && !loadedTransaction) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/pcf">Petty Cash</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Not found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>PCV not found</EmptyTitle>
            <EmptyDescription>
              {errorMessage || "The petty cash transaction you are looking for does not exist."}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => router.push("/pcf")}>Back to Petty Cash</Button>
        </Empty>
      </div>
    );
  }

  const pcvLabel = loadedTransaction?.pcv_number?.trim() || draft.pcvNo || "PCV";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/pcf">Petty Cash</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {id ? (
              <BreadcrumbLink asChild>
                <Link href={`/pcf/${id}`}>{pcvLabel}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{pcvLabel}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit PCV Entry</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{pcvLabel}</span> — update this
            petty cash voucher entry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Cannot save PCV</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Entry Details */}
      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
          <CardDescription>
            Identification, payee, and amounts for this voucher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="date">Date</FieldLabel>
                <Input
                  id="date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => updateDraftField("date", e.target.value)}
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

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => updateDraftField("description", e.target.value)}
                  rows={4}
                  placeholder="Enter description"
                />
              </Field>

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
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
