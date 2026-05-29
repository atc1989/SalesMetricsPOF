"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  createBudget,
  isReferenceNoTaken,
  type ServiceError,
} from "@/services/budget.service";
import { uploadBudgetAttachments } from "@/services/budgetAttachments.service";
import { createVendor, listVendors } from "@/services/vendors.service";
import type { PaymentMethod, PriorityLevel, Vendor } from "@/types/billing";

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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function CreateBudgetPage() {
  const [vendorInput, setVendorInput] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [isVendorLoading, setIsVendorLoading] = useState(false);
  const [showVendorMenu, setShowVendorMenu] = useState(false);
  const vendorBoxRef = useRef<HTMLDivElement | null>(null);

  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isCheckingReference, setIsCheckingReference] = useState(false);
  const [isReferenceTaken, setIsReferenceTaken] = useState(false);
  const [requestDate, setRequestDate] = useState("");
  const [priority, setPriority] = useState("Standard");
  const [reasonForPayment, setReasonForPayment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const [breakdowns, setBreakdowns] = useState<PaymentBreakdown[]>([
    {
      id: "1",
      payment_method: "bank_transfer",
      category: "",
      description: "",
      amount: "",
      bank_name: "",
      bank_account_name: "",
      bank_account_no: "",
    },
  ]);

  const priorityMap: Record<string, PriorityLevel> = useMemo(
    () => ({
      Urgent: "urgent",
      High: "high",
      Standard: "standard",
      Low: "low",
    }),
    [],
  );

  useEffect(() => {
    document.title = "Create Budget Request | GuildLedger";
  }, []);

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

  useEffect(() => {
    const trimmedReference = referenceNumber.trim();
    if (!trimmedReference) {
      setReferenceError(null);
      setIsReferenceTaken(false);
      setIsCheckingReference(false);
      return;
    }
    let isMounted = true;
    setIsCheckingReference(true);
    const timeoutId = window.setTimeout(() => {
      isReferenceNoTaken(trimmedReference)
        .then((taken) => {
          if (!isMounted) return;
          setIsReferenceTaken(taken);
          setReferenceError(
            taken
              ? "PRF already exists. Choose another or leave blank to auto-generate."
              : null,
          );
        })
        .finally(() => {
          if (!isMounted) return;
          setIsCheckingReference(false);
        });
    }, 350);
    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [referenceNumber]);

  const isDuplicatePrfError = (error: string | ServiceError | null | undefined) =>
    typeof error === "object" && error?.code === "DUPLICATE_PRF";

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

  const removeBreakdownLine = (id: string) => {
    if (breakdowns.length > 1) setBreakdowns(breakdowns.filter((b) => b.id !== id));
  };

  const updateBreakdown = (
    id: string,
    field: keyof PaymentBreakdown,
    value: string,
  ) => {
    setBreakdowns(
      breakdowns.map((b) => {
        if (b.id !== id) return b;
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
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;
    setAttachments((prev) => [...prev, ...nextFiles]);
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
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const createBillRecord = async (status: "draft" | "awaiting_approval") => {
    setErrorMessage(null);
    setReferenceError(null);
    if (!user) {
      setErrorMessage("You must be logged in to create a budget request.");
      return;
    }
    if (!vendorInput.trim()) {
      setErrorMessage("Vendor name is required.");
      return;
    }
    if (!requestDate) {
      setErrorMessage("Request date is required.");
      return;
    }
    if (referenceNumber.trim()) {
      const referenceTaken = await isReferenceNoTaken(referenceNumber.trim());
      setIsReferenceTaken(referenceTaken);
      if (referenceTaken) {
        setReferenceError(
          "PRF already exists. Choose another or leave blank to auto-generate.",
        );
        return;
      }
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
    const totalAmount = calculateTotal();
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setErrorMessage("Total amount must be greater than 0.");
      return;
    }

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
        status,
        remarks: reasonForPayment || null,
        total_amount: totalAmount,
        created_by: user.id,
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
    const result = await createBudget(payload);
    if (result.error || !result.data) {
      setIsSaving(false);
      if (isDuplicatePrfError(result.error)) {
        setReferenceError(
          "PRF already exists. Choose another or leave blank to auto-generate.",
        );
        return;
      }
      const message = typeof result.error === "string" ? result.error : result.error?.message;
      setErrorMessage(message || "Failed to create budget request.");
      return;
    }

    if (attachments.length > 0) {
      const attachmentResult = await uploadBudgetAttachments(
        result.data.id,
        attachments,
        user.id,
      );
      if (attachmentResult.error) {
        setIsSaving(false);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `Budget-${result.data.id}-attachmentError`,
            `Budget created, but attachment upload failed: ${attachmentResult.error}`,
          );
        }
        router.push(`/budget/${result.data.id}`);
        return;
      }
    }

    setIsSaving(false);
    router.push(`/budget/${result.data.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBillRecord("awaiting_approval");
  };
  const handleSaveDraft = async () => {
    await createBillRecord("draft");
  };

  const totalAmount = calculateTotal();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <BreadcrumbPage>New Budget</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create New Budget</h1>
          <p className="text-sm text-muted-foreground">
            Create a new payment request for approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/budget")}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            Save as Draft
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isSaving ? "Saving…" : "Submit for Approval"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Cannot save Budget</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Payee & Reference */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Payee & Reference</h2>
          <p className="text-muted-foreground text-sm">
            Vendor, reference number, request date, and priority.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field data-invalid={!vendorInput.trim() ? undefined : undefined}>
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
                  {isVendorLoading
                    ? "Searching vendors…"
                    : "Existing match will be linked. New names create a vendor on save."}
                </FieldDescription>
              </Field>

              <Field data-invalid={isReferenceTaken ? true : undefined}>
                <FieldLabel htmlFor="reference">Reference Number</FieldLabel>
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Optional"
                  aria-invalid={isReferenceTaken || undefined}
                />
                <FieldDescription
                  className={cn(isReferenceTaken && "text-destructive")}
                >
                  {referenceError
                    ? referenceError
                    : isCheckingReference
                      ? "Checking PRF number…"
                      : "Leave blank to auto-generate. Hint: MMDDYY-###"}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="requestDate">
                  Request Date<span className="text-destructive"> *</span>
                </FieldLabel>
                <DatePicker
                  id="requestDate"
                  value={requestDate}
                  onChange={setRequestDate}
                  placeholder="Pick a date"
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
        </div>
      </div>

      <Separator className="my-10" />

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Payment Breakdown</h2>
          <p className="text-muted-foreground text-sm">
            One line per payment method or category.
          </p>
        </div>
        <div className="space-y-4 md:col-span-2">
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
        </div>
      </div>

      <Separator className="my-10" />

      {/* Reason for Payment */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Reason for Payment</h2>
          <p className="text-muted-foreground text-sm">
            Free-text remarks that accompany this payment request.
          </p>
        </div>
        <div className="md:col-span-2">
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
        </div>
      </div>

      <Separator className="my-10" />

      {/* Attachments */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Attachments</h2>
          <p className="text-muted-foreground text-sm">
            Attach scanned forms or proof. PDF, JPG, PNG (max 10MB each).
          </p>
        </div>
        <div className="space-y-4 md:col-span-2">
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

          {attachments.length > 0 && (
            <ul className="flex flex-col gap-2">
              {attachments.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate">{file.name}</span>
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
          )}
        </div>
      </div>

      <Separator className="my-10" />

      {/* Request & Approval Info */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Request & Approval</h2>
          <p className="text-muted-foreground text-sm">
            Populated after submission and review.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Field data-disabled>
                <FieldLabel>Requested By</FieldLabel>
                <Input value={user?.email || "Current User"} disabled />
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
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/budget")}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
        >
          Save as Draft
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {isSaving ? "Saving…" : "Submit for Approval"}
        </Button>
      </div>
    </form>
  );
}
