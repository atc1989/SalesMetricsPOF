"use client";

import { useState } from "react";
import { TopHeader } from "@/components/layout/TopHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  skuCategories,
  skuDiscountColumns,
  toSkuId,
  type SkuCatalog,
  type SkuDiscountMemberType,
  type SkuProduct,
} from "@/lib/dailySalesPackages";
import { useSkuCatalog } from "@/lib/useSkuPricing";

type DiscountColumn = (typeof skuDiscountColumns)[SkuDiscountMemberType];
type TextField = "label" | "original_price" | "bottle_count" | "bundled_blister_count" | DiscountColumn;
type DraftRow = Record<TextField, string> & {
  package_type: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  is_builtin: boolean;
};
type Draft = Record<string, DraftRow>;

const memberColumns = Object.entries(skuDiscountColumns) as Array<[SkuDiscountMemberType, DiscountColumn]>;

const peso = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function toDraftRow(product: SkuProduct): DraftRow {
  return {
    package_type: product.type,
    label: product.label,
    category: product.category,
    original_price: String(product.price),
    bottle_count: String(product.bottleCount),
    bundled_blister_count: String(product.bundledBlisterCount),
    sort_order: product.sortOrder,
    is_active: product.isActive,
    is_builtin: product.isBuiltin,
    ...(Object.fromEntries(
      memberColumns.map(([member, column]) => [column, String(product.discounts[member])]),
    ) as Record<DiscountColumn, string>),
  };
}

const toDraft = (catalog: SkuCatalog): Draft =>
  Object.fromEntries(catalog.products.map((product) => [product.type, toDraftRow(product)]));

const emptyNewProduct = () => ({
  package_type: "",
  label: "",
  category: "protocol",
  original_price: "",
  bottle_count: "0",
  bundled_blister_count: "0",
  ...(Object.fromEntries(memberColumns.map(([, column]) => [column, "0"])) as Record<DiscountColumn, string>),
});

type NewProduct = ReturnType<typeof emptyNewProduct>;

export default function SkuManagementPage() {
  const { catalog, loaded, reload } = useSkuCatalog();
  // Untouched rows show the loaded catalog; the first edit copies it into local state.
  const [edits, setEdits] = useState<Draft | null>(null);
  const draft = edits ?? (loaded ? toDraft(catalog) : null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>(emptyNewProduct);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const updateRow = (type: string, patch: Partial<DraftRow>) => {
    setNotice(null);
    setEdits((prev) => {
      const base = prev ?? toDraft(catalog);
      return { ...base, [type]: { ...base[type], ...patch } };
    });
  };

  const setTextField = (type: string, field: TextField, value: string) =>
    updateRow(type, { [field]: value } as Partial<DraftRow>);

  const onSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setNotice(null);

    try {
      // is_builtin is recomputed server-side.
      const rows = Object.values(draft);
      const response = await fetch("/api/sku-management", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (response.ok && json.success) {
        setEdits(null);
        await reload();
        setNotice({
          ok: true,
          text: "Saved. New encoder entries will use these products; past sales keep their original price.",
        });
      } else {
        setNotice({ ok: false, text: json.message ?? "Failed to save." });
      }
    } catch {
      setNotice({ ok: false, text: "Failed to save." });
    } finally {
      setIsSaving(false);
    }
  };

  const onAdd = async () => {
    setIsAdding(true);
    setAddError(null);
    const maxSort = Math.max(0, ...catalog.products.map((product) => product.sortOrder));

    try {
      const response = await fetch("/api/sku-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: { ...newProduct, package_type: toSkuId(newProduct.package_type), sort_order: maxSort + 10 },
        }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) {
        setAddError(json.message ?? "Failed to add product.");
        return;
      }

      const nextCatalog = await reload();
      const added = nextCatalog.byType[toSkuId(newProduct.package_type)];
      // Keep unsaved edits on other rows.
      if (added) setEdits((prev) => (prev ? { ...prev, [added.type]: toDraftRow(added) } : prev));
      setNotice({ ok: true, text: `Added ${added?.label ?? "product"}.` });
      setAddOpen(false);
      setNewProduct(emptyNewProduct());
    } catch {
      setAddError("Failed to add product.");
    } finally {
      setIsAdding(false);
    }
  };

  const rows = draft ? Object.values(draft).sort((a, b) => a.sort_order - b.sort_order) : [];
  const activeRows = rows.filter((row) => row.is_active);
  const archivedRows = rows.filter((row) => !row.is_active);

  const renderTable = (list: DraftRow[], archived: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Bottles</TableHead>
          <TableHead>Blisters</TableHead>
          <TableHead>Price</TableHead>
          {memberColumns.map(([member]) => (
            <TableHead key={member}>{member} discount</TableHead>
          ))}
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((row) => {
          const type = row.package_type;
          const price = Number(row.original_price) || 0;
          return (
            <TableRow key={type} className={archived ? "opacity-60" : undefined}>
              <TableCell className="font-mono text-xs">
                {type}
                <span className="mt-1 block">
                  <Badge variant="outline">{row.category}</Badge>
                </span>
              </TableCell>
              <TableCell>
                <Input
                  className="w-48"
                  aria-label={`${type} name`}
                  value={row.label}
                  onChange={(event) => updateRow(type, { label: event.target.value })}
                />
              </TableCell>
              {(["bottle_count", "bundled_blister_count"] as const).map((field) => (
                <TableCell key={field}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="w-20"
                    aria-label={`${row.label} ${field === "bottle_count" ? "bottles" : "blisters"}`}
                    value={row[field]}
                    onChange={(event) => setTextField(type, field, event.target.value)}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-28"
                  aria-label={`${row.label} price`}
                  value={row.original_price}
                  onChange={(event) => updateRow(type, { original_price: event.target.value })}
                />
              </TableCell>
              {memberColumns.map(([member, column]) => {
                const discount = Number(row[column]) || 0;
                return (
                  <TableCell key={column}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24"
                      aria-label={`${row.label} ${member} discount`}
                      value={row[column]}
                      onChange={(event) => setTextField(type, column, event.target.value)}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Net {peso(Math.max(price - discount, 0))}
                    </span>
                  </TableCell>
                );
              })}
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateRow(type, { is_active: archived })}
                >
                  {archived ? "Restore" : "Archive"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const setNewField = (field: keyof NewProduct, value: string) =>
    setNewProduct((prev) => ({ ...prev, [field]: value }));

  return (
    <section className="space-y-4">
      <TopHeader
        title="SKU Management"
        subtitle="Products, prices and per-member discounts used by the POF encoder. Archived products are hidden from the encoder; past sales keep working. Use the encoder's One-time / Voucher Discount for online vouchers."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(true)} disabled={!loaded}>
              Add product
            </Button>
            <Button onClick={onSave} disabled={!draft || !edits || isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        }
      />

      {notice ? (
        <p className={notice.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{notice.text}</p>
      ) : null}
      {edits ? <p className="text-sm text-amber-600">You have unsaved changes.</p> : null}

      <Card>
        <CardContent className="overflow-x-auto">
          {!draft ? (
            <p className="py-6 text-sm text-muted-foreground">Loading products...</p>
          ) : (
            renderTable(activeRows, false)
          )}
        </CardContent>
      </Card>

      {archivedRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archived ({archivedRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">{renderTable(archivedRows, true)}</CardContent>
        </Card>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Bottles and blisters are what the encoder releases per unit sold (30 capsules = 1 bottle, 10 capsules = 1
              blister).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="new-sku">SKU ID</Label>
              <Input
                id="new-sku"
                placeholder="e.g. TRIAL_BOTTLE"
                value={newProduct.package_type}
                onChange={(event) => setNewField("package_type", event.target.value)}
              />
              {newProduct.package_type ? (
                <span className="text-xs text-muted-foreground">Saved as {toSkuId(newProduct.package_type)}</span>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-label">Name</Label>
              <Input
                id="new-label"
                value={newProduct.label}
                onChange={(event) => setNewField("label", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={newProduct.category} onValueChange={(value) => setNewField("category", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {skuCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-price">Price</Label>
              <Input
                id="new-price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.original_price}
                onChange={(event) => setNewField("original_price", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-bottles">Bottles per unit</Label>
              <Input
                id="new-bottles"
                type="number"
                min="0"
                step="1"
                value={newProduct.bottle_count}
                onChange={(event) => setNewField("bottle_count", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-blisters">Blisters per unit</Label>
              <Input
                id="new-blisters"
                type="number"
                min="0"
                step="1"
                value={newProduct.bundled_blister_count}
                onChange={(event) => setNewField("bundled_blister_count", event.target.value)}
              />
            </div>
            {memberColumns.map(([member, column]) => (
              <div key={column} className="space-y-1">
                <Label htmlFor={`new-${column}`}>{member} discount</Label>
                <Input
                  id={`new-${column}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct[column]}
                  onChange={(event) => setNewField(column, event.target.value)}
                />
              </div>
            ))}
          </div>

          {addError ? <p className="text-sm text-destructive">{addError}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onAdd} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
