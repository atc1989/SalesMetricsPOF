"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import {
  getBudgetById,
  updateBudget,
  type ServiceError,
} from "@/services/budget.service";
import {
  deleteBudgetAttachments,
  uploadBudgetAttachments,
} from "@/services/budgetAttachments.service";
import { createVendor, listVendors } from "@/services/vendors.service";
import { confirmDiscardChanges } from "@/lib/alerts";
import { useAuth } from "@/lib/auth/AuthContext";
import type {
  BudgetAttachment,
  PaymentMethod,
  PriorityLevel,
  Vendor,
} from "@/types/billing";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface PaymentBreakdown {
  id: string;
  payment_method: PaymentMethod;
  category: string;
  description: string;
  amount: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_no: string;
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "neutral";

const PRIORITY_OPTIONS = [
  { value: "Urgent", label: "Urgent" },
  { value: "High", label: "High" },
  { value: "Standard", label: "Standard" },
  { value: "Low", label: "Low" },
] as const;

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  check: "Check",
  cash: "Cash",
  other: "Other",
};

const getStatusVariant = (status?: string | null): BadgeVariant => {
  switch (status) {
    case "draft":
      return "neutral";
    case "awaiting_approval":
      return "warning";
    case "rejected":
      return "destructive";
    case "approved":
      return "secondary";
    case "paid":
      return "success";
    case "void":
      return "outline";
    default:
      return "neutral";
  }
};

const formatStatus = (status: string | null) => {
  switch (status) {
    case "draft":
      return "Draft";
    case "awaiting_approval":
      return "Awaiting Approval";
    case "rejected":
      return "Rejected";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return "—";
  }
};

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function EditBudgetPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [BudgetStatus, setBudgetStatus] = useState<string | null>(null);

  const [vendorInput, setVendorInput] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [isVendorLoading, setIsVendorLoading] = useState(false);
  const [showVendorMenu, setShowVendorMenu] = useState(false);
  const vendorBoxRef = useRef<HTMLDivElement | null>(null);

  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState("");
  const [priority, setPriority] = useState("Standard");
  const [reasonForPayment, setReasonForPayment] = useState("");
  const [attachments, setAttachments] = useState<BudgetAttachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<BudgetAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [breakdowns, setBreakdowns] = useState<PaymentBreakdown[]>([]);
  const { user } = useAuth();

  const priorityMap: Record<string, PriorityLevel> = useMemo(
    () => ({
      Urgent: "urgent",
      High: "high",
      Standard: "standard",
      Low: "low",
    }),
    [],
  );

  const canEdit = BudgetStatus !== null && BudgetStatus !== "paid";
  const isDuplicatePrfError = (error: string | ServiceError | null | undefined) =>
    typeof error === "object" && error?.code === "DUPLICATE_PRF";

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setIsLoading(false);
      setErrorMessage("Budget request not found.");
      return;
    }
    setIsLoading(true);
    getBudgetById(id)
      .then((result) => {
        if (!isMounted) return;
        if (result.error || !result.data) {
          setErrorMessage(result.error || "Budget request not found.");
          return;
        }
        const { Budget, vendor, breakdowns: lineItems, attachments: existing } = result.data;
        setBudgetStatus(Budget.status);
        setVendorInput(vendor.name);
        setSelectedVendor(vendor);
        setReferenceNumber(Budget.reference_no);
        setRequestDate(Budget.request_date);
        setPriority(
          Budget.priority_level === "urgent"
            ? "Urgent"
            : Budget.priority_level === "high"
              ? "High"
              : Budget.priority_level === "low"
                ? "Low"
                : "Standard",
        );
        setReasonForPayment(Budget.remarks || "");
        setAttachments(existing);
        setAttachmentsToDelete([]);
        setNewFiles([]);
        const nextBreakdowns =
          lineItems.length > 0
            ? lineItems.map((b, idx) => ({
                id: b.id || idx.toString(),
                payment_method: (b.payment_method ?? Budget.payment_method ?? "other") as PaymentMethod,
                category: b.category || "",
                description: b.description || "",
                amount: String(b.amount ?? ""),
                bank_name: b.bank_name || "",
                bank_account_name: b.bank_account_name || "",
                bank_account_no: b.bank_account_no || "",
              }))
            : [
                {
                  id: "recovered-breakdown",
                  payment_method: (Budget.payment_method ?? "other") as PaymentMethod,
                  category: "",
                  description: "",
                  amount: String(Budget.total_amount ?? ""),
                  bank_name: Budget.bank_name || "",
                  bank_account_name: Budget.bank_account_name || "",
                  bank_account_no: Budget.bank_account_no || "",
                },
              ];
        setBreakdowns(nextBreakdowns);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load budget request.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    if (!vendorInput.trim()) {
      setVendorOptions([]);
      return;
    }
    setIsVendorLoading(true);
    listVendors(vendorInput)
      .then((result) => {
        if (!isMounted) return;
        if (result.error) setVendorOptions([]);
        else setVendorOptions(result.data);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsVendorLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [vendorInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vendorBoxRef.current && !vendorBoxRef.current.contains(e.target as Node)) {
        setShowVendorMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addBreakdownLine = () => {
    setBreakdowns([
      ...breakdowns,
      {
        id: Date.now().toString(),
        payment_method: "bank_transfer",
        category: "",
        description: "",
        amount: "",
        bank_name: "",
        bank_account_name: "",
        bank_account_no: "",
      },
    ]);
  };
  const removeBreakdownLine = (lineId: string) => {
    if (breakdowns.length > 1) setBreakdowns(breakdowns.filter((b) => b.id !== lineId));
  };
  const updateBreakdown = (lineId: string, field: keyof PaymentBreakdown, value: string) => {
    setBreakdowns(
      breakdowns.map((b) => {
        if (b.id !== lineId) return b;
        if (field === "payment_method" && value !== "bank_transfer") {
          return {
            ...b,
            payment_method: value as PaymentMethod,
            bank_name: "",
            bank_account_name: "",
            bank_account_no: "",
          };
        }
        return { ...b, [field]: value };
      }),
    );
  };
  const calculateTotal = () =>
    roundMoney(breakdowns.reduce((sum, b) => sum + roundMoney(b.amount), 0));

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files);
    if (!next.length) return;
    setNewFiles((prev) => [...prev, ...next]);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(e.target.files);
    e.target.value = "";
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!e.dataTransfer.files) return;
    addFiles(e.dataTransfer.files);
  };
  const removeAttachment = (index: number) => {
    const removed = attachments[index];
    if (removed) setAttachmentsToDelete((prev) => [...prev, removed]);
    setAttachments(attachments.filter((_, i) => i !== index));
  };
  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!id) return;
    if (!canEdit) {
      setErrorMessage("Paid budget requests can no longer be edited.");
      return;
    }
    setReferenceError(null);
    if (!vendorInput.trim()) {
      setErrorMessage("Vendor name is required.");
      return;
    }
    if (!requestDate) {
      setErrorMessage("Request date is required.");
      return;
    }
    if (breakdowns.length === 0) {
      setErrorMessage("At least one breakdown line is required.");
      return;
    }
    const missingBankDetails = breakdowns.some(
      (b) =>
        b.payment_method === "bank_transfer" &&
        (!b.bank_name.trim() || !b.bank_account_name.trim() || !b.bank_account_no.trim()),
    );
    if (missingBankDetails) {
      setErrorMessage(
        "Bank name, account holder, and account number are required for Bank Transfer lines.",
      );
      return;
    }
    const hasInvalidAmount = breakdowns.some((b) => {
      const parsed = parseFloat(b.amount);
      return !Number.isFinite(parsed) || parsed <= 0;
    });
    if (hasInvalidAmount) {
      setErrorMessage("All breakdown amounts must be greater than 0.");
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    let vendorId = selectedVendor?.id;
    if (!vendorId) {
      const vendorResult = await createVendor(vendorInput.trim());
      if (vendorResult.error || !vendorResult.data) {
        setIsSaving(false);
        setErrorMessage(vendorResult.error || "Failed to create vendor.");
        return;
      }
      vendorId = vendorResult.data.id;
    }
    const totalAmount = calculateTotal();
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setIsSaving(false);
      setErrorMessage("Total amount must be greater than 0.");
      return;
    }
    const primaryPaymentMethod = breakdowns[0]?.payment_method ?? "other";
    const payload = {
      Budget: {
        vendor_id: vendorId,
        reference_no: referenceNumber,
        request_date: requestDate,
        priority_level: priorityMap[priority] || "standard",
        payment_method: primaryPaymentMethod,
        bank_name: null,
        bank_account_name: null,
        bank_account_no: null,
        remarks: reasonForPayment || null,
        total_amount: totalAmount,
      },
      breakdowns: breakdowns.map((b) => ({
        payment_method: b.payment_method,
        category: b.category.trim() || null,
        description: b.description ? b.description : "",
        amount: roundMoney(b.amount),
        bank_name: b.payment_method === "bank_transfer" ? b.bank_name || null : null,
        bank_account_name:
          b.payment_method === "bank_transfer" ? b.bank_account_name || null : null,
        bank_account_no:
          b.payment_method === "bank_transfer" ? b.bank_account_no || null : null,
      })),
    };
    const result = await updateBudget(id, payload);
    if (result.error) {
      setIsSaving(false);
      if (isDuplicatePrfError(result.error)) {
        setReferenceError("PRF already exists. Choose another or leave blank to auto-generate.");
        return;
      }
      const message = typeof result.error === "string" ? result.error : result.error?.message;
      setErrorMessage(message || "Failed to update budget request.");
      return;
    }

    if (attachmentsToDelete.length > 0) {
      const deleteResult = await deleteBudgetAttachments(attachmentsToDelete);
      if (deleteResult.error) {
        setIsSaving(false);
        setErrorMessage(`Budget request updated, but failed to delete attachments: ${deleteResult.error}`);
        return;
      }
    }

    if (newFiles.length > 0) {
      const uploadResult = await uploadBudgetAttachments(id, newFiles, user?.id);
      if (uploadResult.error) {
        setIsSaving(false);
        setErrorMessage(`Budget request updated, but attachment upload failed: ${uploadResult.error}`);
        return;
      }
    }

    setIsSaving(false);
    router.push(`/budget/${id}`);
  };

  const handleCancel = async () => {
    const shouldDiscard = await confirmDiscardChanges();
    if (shouldDiscard) router.push(`/budget/${id ?? ""}`);
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

  if (errorMessage && !BudgetStatus) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/budget">Bills</Link>
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
            <EmptyTitle>Budget request not found</EmptyTitle>
            <EmptyDescription>{errorMessage}</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => router.push("/budget")}>Back to Bills</Button>
        </Empty>
      </div>
    );
  }

  const totalAmount = calculateTotal();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSaveChanges();
      }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/budget">Bills</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/budget/${id ?? ""}`}>{referenceNumber}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Edit Payment Request</h1>
            <Badge variant={getStatusVariant(BudgetStatus)}>{formatStatus(BudgetStatus)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{referenceNumber}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canEdit || isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Read-only banner */}
      {!canEdit && (
        <Alert variant="default">
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            This Budget is {formatStatus(BudgetStatus)} and can no longer be edited because it is paid.
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Cannot save Budget</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <fieldset disabled={!canEdit || isSaving} className="space-y-6">
        {/* Payee & Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Payee & Reference</CardTitle>
            <CardDescription>Vendor, reference number, request date, and priority.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="vendor">
                    Vendor / Payee<span className="text-destructive"> *</span>
                  </FieldLabel>
                  <div ref={vendorBoxRef} className="relative">
                    <Input
                      id="vendor"
                      value={vendorInput}
                      onChange={(e) => {
                        setVendorInput(e.target.value);
                        setSelectedVendor(null);
                        setShowVendorMenu(true);
                      }}
                      onFocus={() => setShowVendorMenu(true)}
                      placeholder="Select or type vendor name"
                      autoComplete="off"
                      required
                    />
                    {showVendorMenu && !selectedVendor && vendorOptions.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                        {vendorOptions.map((vendor) => (
                          <button
                            type="button"
                            key={vendor.id}
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setVendorInput(vendor.name);
                              setVendorOptions([]);
                              setShowVendorMenu(false);
                            }}
                            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            {vendor.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <FieldDescription>
                    {isVendorLoading ? "Searching vendors…" : "Existing match will be linked."}
                  </FieldDescription>
                </Field>

                <Field data-invalid={referenceError ? true : undefined}>
                  <FieldLabel htmlFor="reference">Reference Number</FieldLabel>
                  <Input
                    id="reference"
                    value={referenceNumber}
                    onChange={(e) => {
                      setReferenceNumber(e.target.value);
                      setReferenceError(null);
                    }}
                    placeholder="Optional"
                    disabled={!canEdit}
                    aria-invalid={referenceError ? true : undefined}
                  />
                  <FieldDescription
                    className={cn(referenceError && "text-destructive")}
                  >
                    {referenceError
                      ? referenceError
                      : canEdit
                        ? "Leave blank to auto-generate. Hint: MMDDYY-###"
                        : "Reference number cannot be edited."}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="requestDate">
                    Request Date<span className="text-destructive"> *</span>
                  </FieldLabel>
                  <Input
                    id="requestDate"
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel>Priority Level</FieldLabel>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={priority}
                    onValueChange={(value) => value && setPriority(value)}
                    className="justify-start"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <ToggleGroupItem key={option.value} value={option.value}>
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Payment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
            <CardDescription>One line per payment method or category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Payment Method</TableHead>
                    <TableHead className="w-40">Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-40 text-right">Amount (PHP)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdowns.map((breakdown) => (
                    <React.Fragment key={breakdown.id}>
                      <TableRow>
                        <TableCell>
                          <Select
                            value={breakdown.payment_method}
                            onValueChange={(value) =>
                              updateBreakdown(breakdown.id, "payment_method", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map(
                                (method) => (
                                  <SelectItem key={method} value={method}>
                                    {PAYMENT_METHOD_LABEL[method]}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={breakdown.category}
                            onChange={(e) =>
                              updateBreakdown(breakdown.id, "category", e.target.value)
                            }
                            placeholder="e.g., Food"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={breakdown.description}
                            onChange={(e) =>
                              updateBreakdown(breakdown.id, "description", e.target.value)
                            }
                            placeholder="Brief description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={breakdown.amount}
                            onChange={(e) =>
                              updateBreakdown(breakdown.id, "amount", e.target.value)
                            }
                            placeholder="0.00"
                            className="text-right tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBreakdownLine(breakdown.id)}
                            disabled={breakdowns.length === 1}
                            aria-label="Remove line"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {breakdown.payment_method === "bank_transfer" && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5}>
                            <FieldGroup>
                              <div className="grid grid-cols-1 gap-4 px-2 py-2 md:grid-cols-3">
                                <Field>
                                  <FieldLabel>Bank Name</FieldLabel>
                                  <Input
                                    value={breakdown.bank_name}
                                    onChange={(e) =>
                                      updateBreakdown(
                                        breakdown.id,
                                        "bank_name",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="BDO / BPI / Metrobank…"
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel>Account Holder</FieldLabel>
                                  <Input
                                    value={breakdown.bank_account_name}
                                    onChange={(e) =>
                                      updateBreakdown(
                                        breakdown.id,
                                        "bank_account_name",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Full name as registered"
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel>Account Number</FieldLabel>
                                  <Input
                                    value={breakdown.bank_account_no}
                                    onChange={(e) =>
                                      updateBreakdown(
                                        breakdown.id,
                                        "bank_account_no",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Account number"
                                  />
                                </Field>
                              </div>
                            </FieldGroup>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addBreakdownLine}>
              <Plus data-icon="inline-start" />
              Add Breakdown Line
            </Button>

            <Separator />

            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-semibold tabular-nums">
                  ₱
                  {totalAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reason for Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Reason for Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reason">Reason / Remarks</FieldLabel>
                <Textarea
                  id="reason"
                  value={reasonForPayment}
                  onChange={(e) => setReasonForPayment(e.target.value)}
                  rows={5}
                  placeholder="Brief explanation or supporting details…"
                />
                <FieldDescription>Optional. Visible on the printed receipt.</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>PDF, JPG, PNG (max 10MB each).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Existing</p>
                <ul className="flex flex-col gap-2">
                  {attachments.map((attachment, index) => (
                    <li
                      key={attachment.id ?? index}
                      className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{attachment.file_name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                        aria-label="Remove attachment"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "bg-muted/30",
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Upload className="size-4" />
              </div>
              <div className="text-sm">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
                >
                  Click to upload
                </label>{" "}
                <span className="text-muted-foreground">or drag and drop</span>
              </div>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB each)</p>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {newFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">New</p>
                <ul className="flex flex-col gap-2">
                  {newFiles.map((file, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-md border bg-primary/5 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNewFile(index)}
                        aria-label="Remove file"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request & Approval Info */}
        <Card>
          <CardHeader>
            <CardTitle>Request & Approval</CardTitle>
            <CardDescription>Read-only audit fields.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <Field data-disabled>
                  <FieldLabel>Requested By</FieldLabel>
                  <Input value="—" disabled />
                </Field>
                <Field data-disabled>
                  <FieldLabel>Submitted Date</FieldLabel>
                  <Input value={requestDate || "—"} disabled />
                </Field>
                <Field data-disabled>
                  <FieldLabel>Checked By</FieldLabel>
                  <Input value="—" disabled />
                </Field>
                <Field data-disabled>
                  <FieldLabel>Approved By</FieldLabel>
                  <Input value="—" disabled />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </fieldset>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canEdit || isSaving}>
          {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
