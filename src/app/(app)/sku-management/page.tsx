"use client";

import { useState } from "react";
import { TopHeader } from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  encoderPackageOptions,
  skuDiscountColumns,
  type SkuPricing,
  type SkuDiscountMemberType,
} from "@/lib/dailySalesPackages";
import { useSkuPricing } from "@/lib/useSkuPricing";

type Field = "original_price" | (typeof skuDiscountColumns)[SkuDiscountMemberType];
type Draft = Record<string, Record<Field, string>>;

const memberColumns = Object.entries(skuDiscountColumns) as Array<
  [SkuDiscountMemberType, (typeof skuDiscountColumns)[SkuDiscountMemberType]]
>;

const peso = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function toDraft(pricing: SkuPricing): Draft {
  return Object.fromEntries(
    encoderPackageOptions.map(({ value: type }) => [
      type,
      {
        original_price: String(pricing.prices[type]),
        ...Object.fromEntries(
          memberColumns.map(([member, column]) => [column, String(pricing.discounts[member][type])]),
        ),
      } as Record<Field, string>,
    ]),
  );
}

export default function SkuManagementPage() {
  const { pricing, loaded } = useSkuPricing();
  // Untouched rows show the loaded prices; the first edit copies them into local state.
  const [edits, setEdits] = useState<Draft | null>(null);
  const draft = edits ?? (loaded ? toDraft(pricing) : null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const setField = (type: string, field: Field, value: string) => {
    setNotice(null);
    setEdits((prev) => {
      const base = prev ?? toDraft(pricing);
      return { ...base, [type]: { ...base[type], [field]: value } };
    });
  };

  const onSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setNotice(null);

    try {
      const rows = Object.entries(draft).map(([package_type, fields]) => ({ package_type, ...fields }));
      const response = await fetch("/api/sku-management", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      setNotice(
        response.ok && json.success
          ? { ok: true, text: "Prices saved. New encoder entries will use them; past sales keep their original price." }
          : { ok: false, text: json.message ?? "Failed to save prices." },
      );
    } catch {
      setNotice({ ok: false, text: "Failed to save prices." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <TopHeader
        title="SKU Management"
        subtitle="Package prices and per-member discounts used by the POF encoder. Use the encoder's One-time / Voucher Discount for online vouchers."
        actions={
          <Button onClick={onSave} disabled={!draft || isSaving}>
            {isSaving ? "Saving..." : "Save prices"}
          </Button>
        }
      />

      {notice ? (
        <p className={notice.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{notice.text}</p>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto">
          {!draft ? (
            <p className="py-6 text-sm text-muted-foreground">Loading prices...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  {memberColumns.map(([member]) => (
                    <TableHead key={member}>{member} discount</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {encoderPackageOptions.map(({ value: type, label }) => {
                  const fields = draft[type];
                  const price = Number(fields.original_price) || 0;
                  return (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28"
                          aria-label={`${label} price`}
                          value={fields.original_price}
                          onChange={(event) => setField(type, "original_price", event.target.value)}
                        />
                      </TableCell>
                      {memberColumns.map(([member, column]) => {
                        const discount = Number(fields[column]) || 0;
                        return (
                          <TableCell key={column}>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24"
                              aria-label={`${label} ${member} discount`}
                              value={fields[column]}
                              onChange={(event) => setField(type, column, event.target.value)}
                            />
                            <span className="mt-1 block text-xs text-muted-foreground">
                              Net {peso(Math.max(price - discount, 0))}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
