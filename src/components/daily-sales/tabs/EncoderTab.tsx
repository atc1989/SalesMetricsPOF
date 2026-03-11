'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  dailySalesDiscountMatrix,
  encoderPackageOptions,
  getDailySalesPackageBlisterCount,
  getDailySalesPackageBottleCount,
  getDailySalesPackageConfig,
  getDailySalesPackagePrice,
  hasBundledPackageBlisters,
} from '@/lib/dailySalesPackages';
import type {
  EncoderBlisterOption,
  EncoderFormModel,
  EncoderMemberTypeOption,
  EncoderPackageTypeOption,
  EncoderPaymentModeOption,
} from '@/types/dailySales';

type PaymentTypeOption = {
  label: string;
  value: string;
};

const primaryPaymentModes: Exclude<EncoderPaymentModeOption, 'N/A'>[] = [
  'CASH',
  'BANK',
  'MAYA(IGI)',
  'MAYA(ATC)',
  'SBCOLLECT(IGI)',
  'SBCOLLECT(ATC)',
  'EWALLET',
  'CHEQUE',
  'EPOINTS',
  'CONSIGNMENT',
  'AR(CSA)',
  'AR(LEADERSUPPORT)',
];

const secondaryPaymentModes: EncoderPaymentModeOption[] = ['N/A', ...primaryPaymentModes];

const paymentTypeOptionsByMode: Partial<Record<Exclude<EncoderPaymentModeOption, 'N/A'>, PaymentTypeOption[]>> = {
  BANK: [
    { label: 'Security Bank', value: 'SECURITYBANK' },
    { label: 'BPI', value: 'BPI' },
    { label: 'BDO', value: 'BDO' },
    { label: 'GoTyme', value: 'GOTYME' },
  ],
  EWALLET: [{ label: 'Payout', value: 'PAYOUT' }],
};

const defaultPaymentTypeOption: PaymentTypeOption = { label: 'N/A', value: 'N/A' };

const discountOptions: Array<{ label: string; value: number }> = [
  { label: 'No Discount', value: 0 },
  { label: '₱50', value: 50 },
  { label: '₱150', value: 150 },
  { label: '₱500', value: 500 },
  { label: '₱80', value: 80 },
  { label: '₱240', value: 240 },
  { label: '₱800', value: 800 },
  { label: '₱1748', value: 1748 },
  { label: '40% (₱1,520)', value: 1520 },
  { label: '45% (₱1,710)', value: 1710 },
  { label: '50% (₱1,900)', value: 1900 },
  { label: '40% (₱520)', value: 520 },
  { label: '45% (₱585)', value: 585 },
  { label: '47.5% (₱618)', value: 618 },
  { label: '50% (₱650)', value: 650 },
];

const encoderDiscountOptions: Array<{ label: string; value: number }> = [
  { label: 'No Discount', value: 0 },
  { label: '10% (P380)', value: 380 },
  { label: '20% (P760)', value: 760 },
  { label: 'P50', value: 50 },
  { label: 'P60', value: 60 },
  { label: 'P150', value: 150 },
  { label: 'P500', value: 500 },
  { label: 'P80', value: 80 },
  { label: 'P240', value: 240 },
  { label: 'P800', value: 800 },
  { label: 'P1748', value: 1748 },
  { label: '40% (P1,520)', value: 1520 },
  { label: '45% (P1,710)', value: 1710 },
  { label: '50% (P1,900)', value: 1900 },
  { label: '40% (P520)', value: 520 },
  { label: '45% (P585)', value: 585 },
  { label: '47.5% (P618)', value: 618 },
  { label: '50% (P650)', value: 650 },
];

void discountOptions;

const today = new Date().toISOString().slice(0, 10);

type UserSearchResult = {
  username: string;
  memberName: string;
};

function formatPofBaseFromDate(date: string): string {
  const parsed = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  if (!parsed) {
    return '';
  }

  const [, month, day] = parsed;
  const year = date.slice(2, 4);
  return `${month}${day}${year} - `;
}

function getPaymentTypeOptions(mode: EncoderPaymentModeOption): PaymentTypeOption[] {
  if (mode === 'N/A') {
    return [defaultPaymentTypeOption];
  }

  return paymentTypeOptionsByMode[mode] ?? [defaultPaymentTypeOption];
}

function applyMemberPackageRules(
  current: EncoderFormModel,
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption
): EncoderFormModel {
  const packageConfig = getDailySalesPackageConfig(packageType);

  return {
    ...current,
    memberType,
    packageType,
    originalPrice: packageConfig.originalPrice,
    discount: dailySalesDiscountMatrix[memberType][packageType],
    isToBlister: packageConfig.defaultIsToBlister,
  };
}

const buildInitialForm = (): EncoderFormModel => {
  const base: EncoderFormModel = {
    event: 'DAVAO',
    date: today,
    pofNumber: formatPofBaseFromDate(today),
    name: '',
    username: '',
    newMember: '1',
    memberType: 'DISTRIBUTOR',
    packageType: 'SILVER',
    isToBlister: getDailySalesPackageConfig('SILVER').defaultIsToBlister,
    originalPrice: getDailySalesPackagePrice('SILVER'),
    quantity: 1,
    blisterCount: 0,
    discount: 0,
    price: getDailySalesPackagePrice('SILVER'),
    oneTimeDiscount: 0,
    noOfBottles: 1,
    sales: getDailySalesPackagePrice('SILVER'),
    paymentMode: 'CASH',
    paymentType: 'N/A',
    referenceNo: 'N/A',
    paymentModeTwo: 'N/A',
    paymentTypeTwo: 'N/A',
    referenceNoTwo: 'N/A',
    salesTwo: 0,
    released: 1,
    releasedBlpk: 0,
    toFollow: 0,
    toFollowBlpk: 0,
    remarks: '',
    receivedBy: 'Hanna Jean Fernandez',
    collectedBy: 'Jake Roldan Laurente',
  };

  return applyMemberPackageRules(base, base.memberType, base.packageType);
};

type ManualOverrideKey =
  | 'blisterCount'
  | 'oneTimeDiscount'
  | 'price'
  | 'sales'
  | 'released'
  | 'releasedBlpk'
  | 'toFollow'
  | 'toFollowBlpk'
  | 'salesTwo';

type ManualOverrides = Record<ManualOverrideKey, boolean>;

const initialManualOverrides: ManualOverrides = {
  blisterCount: false,
  oneTimeDiscount: false,
  price: false,
  sales: false,
  released: false,
  releasedBlpk: false,
  toFollow: false,
  toFollowBlpk: false,
  salesTwo: false,
};

const applyComputedFields = (input: EncoderFormModel, manualOverrides: ManualOverrides): EncoderFormModel => {
  const quantity = Math.max(input.quantity, 0);
  const discount = Math.max(input.discount, 0);
  const oneTimeDiscount = manualOverrides.oneTimeDiscount ? input.oneTimeDiscount : Math.max(input.oneTimeDiscount, 0);
  const price = manualOverrides.price ? input.price : Math.max(input.originalPrice - discount, 0);
  const blisterCount = manualOverrides.blisterCount
    ? Math.max(input.blisterCount, 0)
    : getDailySalesPackageBlisterCount(input.packageType, quantity, input.isToBlister);
  const noOfBottles = getDailySalesPackageBottleCount(input.packageType, quantity);
  const sales = manualOverrides.sales ? input.sales : Math.max(price * quantity - oneTimeDiscount, 0);
  const released = manualOverrides.released ? input.released : noOfBottles;
  const releasedBlpk = manualOverrides.releasedBlpk ? input.releasedBlpk : blisterCount;
  const normalizedSalesTwo = manualOverrides.salesTwo
    ? input.salesTwo
    : input.paymentMode === 'EPOINTS'
      ? sales
      : Math.min(Math.max(input.salesTwo, 0), sales);

  return {
    ...input,
    quantity,
    discount,
    oneTimeDiscount,
    blisterCount,
    noOfBottles,
    price,
    sales,
    released,
    releasedBlpk,
    salesTwo: normalizedSalesTwo,
  };
};

type NumericField =
  | 'quantity'
  | 'blisterCount'
  | 'discount'
  | 'price'
  | 'oneTimeDiscount'
  | 'sales'
  | 'released'
  | 'releasedBlpk'
  | 'toFollow'
  | 'toFollowBlpk'
  | 'salesTwo';

export function EncoderTab() {
  const [form, setForm] = useState<EncoderFormModel>(() => applyComputedFields(buildInitialForm(), initialManualOverrides));
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>(initialManualOverrides);
  const [isPofManuallyEdited, setIsPofManuallyEdited] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [paymentModeTwoError, setPaymentModeTwoError] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isBundledPackage = hasBundledPackageBlisters(form.packageType);

  const primaryPaymentTypeOptions = useMemo(() => getPaymentTypeOptions(form.paymentMode), [form.paymentMode]);
  const secondaryPaymentTypeOptions = useMemo(() => getPaymentTypeOptions(form.paymentModeTwo), [form.paymentModeTwo]);
  const primaryTypeIsReadOnly = primaryPaymentTypeOptions.length === 1 && primaryPaymentTypeOptions[0].value === 'N/A';
  const secondaryTypeIsReadOnly = secondaryPaymentTypeOptions.length === 1 && secondaryPaymentTypeOptions[0].value === 'N/A';
  const resetForm = () => {
    setForm(applyComputedFields(buildInitialForm(), initialManualOverrides));
    setManualOverrides(initialManualOverrides);
    setIsPofManuallyEdited(false);
    setUserSearchResults([]);
    setUserSearchError(null);
    setPaymentModeTwoError('');
  };

  useEffect(() => {
    const query = form.username.trim();
    if (query.length < 2) {
      setUserSearchResults([]);
      setUserSearchError(null);
      setIsUserSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsUserSearchLoading(true);
      setUserSearchError(null);

      try {
        const response = await fetch(`/api/daily-sales/users/search?q=${encodeURIComponent(query)}&limit=10`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          rows?: UserSearchResult[];
          message?: string;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? 'Unable to search users.');
        }

        setUserSearchResults(payload.rows ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setUserSearchResults([]);
        setUserSearchError(error instanceof Error ? error.message : 'Unable to search users.');
      } finally {
        setIsUserSearchLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.username]);

  const updateField = <K extends keyof EncoderFormModel>(key: K, value: EncoderFormModel[K]) => {
    setForm((prev) => applyComputedFields({ ...prev, [key]: value }, manualOverrides));
  };

  const onDateChange = (value: string) => {
    setForm((prev) => {
      const nextPof = isPofManuallyEdited ? prev.pofNumber : formatPofBaseFromDate(value);
      return applyComputedFields({ ...prev, date: value, pofNumber: nextPof }, manualOverrides);
    });
  };

  const onPofChange = (value: string) => {
    const autoPof = formatPofBaseFromDate(form.date);
    setIsPofManuallyEdited(value.trim() !== '' && value !== autoPof);
    updateField('pofNumber', value);
  };

  const onUsernameChange = (value: string) => {
    updateField('username', value);
    const match = userSearchResults.find((entry) => entry.username.toLowerCase() === value.toLowerCase());
    if (match) {
      updateField('name', match.memberName);
    }
  };

  const updateNumericField = (key: NumericField, value: string, manualKey?: ManualOverrideKey) => {
    const parsed = Number(value || 0);
    const numericValue = Number.isFinite(parsed) ? parsed : 0;
    const nextOverrides = manualKey
      ? { ...manualOverrides, [manualKey]: true }
      : manualOverrides;

    if (manualKey) {
      setManualOverrides(nextOverrides);
    }

    setForm((prev) => applyComputedFields({ ...prev, [key]: numericValue }, nextOverrides));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      event_name: form.event,
      trans_date: form.date,
      pof_number: form.pofNumber,
      member_name: form.name,
      username: form.username,
      is_new_member: form.newMember === '1',
      member_type: form.memberType,
      package_type: form.packageType,
      original_price: form.originalPrice,
      quantity: form.quantity,
      is_to_blister: form.isToBlister === '1',
      blister_count: form.blisterCount,
      discount: form.discount,
      price_after_discount: form.price,
      one_time_discount: form.oneTimeDiscount,
      bottle_count: form.noOfBottles,
      released_count: form.released,
      released_blpk_count: form.releasedBlpk,
      to_follow_count: form.toFollow,
      to_follow_blpk_count: form.toFollowBlpk,
      sales: form.sales,
      mode_of_payment: form.paymentMode === 'N/A' ? null : form.paymentMode,
      payment_type: form.paymentType === 'N/A' ? null : form.paymentType,
      reference_number: form.referenceNo === 'N/A' ? null : form.referenceNo,
      sales_two: form.salesTwo,
      mode_of_payment_two: form.paymentModeTwo === 'N/A' ? null : form.paymentModeTwo,
      payment_type_two: form.paymentTypeTwo === 'N/A' ? null : form.paymentTypeTwo,
      reference_number_two: form.referenceNoTwo === 'N/A' ? null : form.referenceNoTwo,
      remarks: form.remarks,
      received_by: form.receivedBy,
      collected_by: form.collectedBy,
      fullfilment_date: form.date,
    };

    try {
      const response = await fetch('/api/daily-sales/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? 'Failed to save daily sales entry.');
      }

      setIsSavedOpen(true);
      resetForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save daily sales entry.');
    }
  };

  const onReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetForm();
  };

  const onMemberTypeChange = (value: EncoderMemberTypeOption) => {
    setForm((prev) => applyComputedFields(applyMemberPackageRules(prev, value, prev.packageType), manualOverrides));
  };

  const onPackageTypeChange = (value: EncoderPackageTypeOption) => {
    setForm((prev) => applyComputedFields(applyMemberPackageRules(prev, prev.memberType, value), manualOverrides));
  };

  const onPaymentModeChange = (value: Exclude<EncoderPaymentModeOption, 'N/A'>) => {
    setForm((prev) => {
      const primaryOptions = getPaymentTypeOptions(value);
      const nextPaymentType = primaryOptions[0]?.value ?? 'N/A';
      const nextReferenceNo = nextPaymentType === 'N/A' ? 'N/A' : '';
      const nextSalesTwo = manualOverrides.salesTwo
        ? prev.salesTwo
        : value === 'EPOINTS'
          ? prev.sales
          : prev.salesTwo;

      if (prev.paymentModeTwo !== 'N/A' && prev.paymentModeTwo === value) {
        setPaymentModeTwoError('Secondary payment mode cannot match primary mode.');
        return applyComputedFields({
          ...prev,
          paymentMode: value,
          paymentType: nextPaymentType,
          referenceNo: nextReferenceNo,
          salesTwo: nextSalesTwo,
          paymentModeTwo: 'N/A',
          paymentTypeTwo: 'N/A',
          referenceNoTwo: 'N/A',
        }, manualOverrides);
      }

      return applyComputedFields({
        ...prev,
        paymentMode: value,
        paymentType: nextPaymentType,
        referenceNo: nextReferenceNo,
        salesTwo: nextSalesTwo,
      }, manualOverrides);
    });
  };

  const onPaymentModeTwoChange = (value: EncoderPaymentModeOption) => {
    if (value !== 'N/A' && value === form.paymentMode) {
      setPaymentModeTwoError('Secondary payment mode cannot match primary mode.');
      setForm((prev) =>
        applyComputedFields({
          ...prev,
          paymentModeTwo: 'N/A',
          paymentTypeTwo: 'N/A',
          referenceNoTwo: 'N/A',
        }, manualOverrides)
      );
      return;
    }

    setPaymentModeTwoError('');
    const secondaryOptions = getPaymentTypeOptions(value);
    const nextPaymentTypeTwo = secondaryOptions[0]?.value ?? 'N/A';
    const nextReferenceNoTwo = nextPaymentTypeTwo === 'N/A' ? 'N/A' : '';

    setForm((prev) =>
      applyComputedFields({
        ...prev,
        paymentModeTwo: value,
        paymentTypeTwo: nextPaymentTypeTwo,
        referenceNoTwo: nextReferenceNoTwo,
      }, manualOverrides)
    );
  };

  return (
    <>
      <section id="encoder" className="mt-4">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Encoder</h2>
          {submitError ? <p className="mb-3 text-sm text-red-600">{submitError}</p> : null}
          <form id="salesForm" className="space-y-6" onSubmit={onSubmit} onReset={onReset}>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Event
                <input
                  id="event"
                  value={form.event}
                  onChange={(event) => updateField('event', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Date
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) => onDateChange(event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                POF Number
                <input
                  id="pofNumber"
                  value={form.pofNumber}
                  onChange={(event) => onPofChange(event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Member Name
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Username
                <input
                  id="username"
                  list="encoder-usernames"
                  value={form.username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
                <datalist id="encoder-usernames">
                  {userSearchResults.map((entry) => (
                    <option key={entry.username} value={entry.username}>
                      {entry.memberName}
                    </option>
                  ))}
                </datalist>
                {isUserSearchLoading ? <span className="text-xs text-slate-500">Searching users…</span> : null}
                {userSearchError ? <span className="text-xs text-red-600">{userSearchError}</span> : null}
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                New Member?
                <select
                  id="newMember"
                  value={form.newMember}
                  onChange={(event) => updateField('newMember', event.target.value as '1' | '0')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Member Type
                <select id="memberType" value={form.memberType} onChange={(event) => onMemberTypeChange(event.target.value as EncoderMemberTypeOption)} className="h-10 rounded-md border border-slate-300 px-3">
                  <option value="DISTRIBUTOR">Distributor</option>
                  <option value="STOCKIST">Mobile Stockist</option>
                  <option value="CITY STOCKIST">City Stockist</option>
                  <option value="CENTER">Center</option>
                  <option value="NON-MEMBER">Non-member</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Package Type
                <select id="packageType" value={form.packageType} onChange={(event) => onPackageTypeChange(event.target.value as EncoderPackageTypeOption)} className="h-10 rounded-md border border-slate-300 px-3">
                  {encoderPackageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Blister?
                <select
                  id="isToBlister"
                  value={form.isToBlister}
                  onChange={(event) => updateField('isToBlister', event.target.value as EncoderBlisterOption)}
                  disabled={isBundledPackage}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
                {isBundledPackage ? (
                  <span className="text-xs text-slate-500">Package bundles already include blister counts.</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Original Price
                <input
                  id="originalPrice"
                  type="number"
                  value={form.originalPrice}
                  readOnly
                  className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Quantity
                <input
                  id="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => updateNumericField('quantity', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Blister Count
                <input
                  id="blisterCount"
                  type="number"
                  min="0"
                  value={form.blisterCount}
                  onChange={(event) => updateNumericField('blisterCount', event.target.value, 'blisterCount')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Discount
                <select
                  id="discount"
                  value={form.discount}
                  onChange={(event) => updateNumericField('discount', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  {encoderDiscountOptions.map((option) => (
                    <option key={`discount-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Price
                <input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(event) => updateNumericField('price', event.target.value, 'price')}
                  className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                One-time Discount
                <input
                  id="oneTimeDiscount"
                  type="number"
                  min="0"
                  value={form.oneTimeDiscount}
                  onChange={(event) => updateNumericField('oneTimeDiscount', event.target.value, 'oneTimeDiscount')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Number of Bottles
                <input
                  id="noOfBottles"
                  type="number"
                  value={form.noOfBottles}
                  readOnly
                  className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Total Sales
                <input
                  id="sales"
                  type="number"
                  value={form.sales}
                  onChange={(event) => updateNumericField('sales', event.target.value, 'sales')}
                  className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Mode of Payment
                <select id="paymentMode" value={form.paymentMode} onChange={(event) => onPaymentModeChange(event.target.value as Exclude<EncoderPaymentModeOption, 'N/A'>)} className="h-10 rounded-md border border-slate-300 px-3">
                  {primaryPaymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === 'AR(LEADERSUPPORT)' ? 'AR (LEADER SUPPORT)' : mode}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Payment Mode Type
                <select
                  id="paymentType"
                  value={form.paymentType}
                  onChange={(event) => updateField('paymentType', event.target.value)}
                  disabled={primaryTypeIsReadOnly}
                  className="h-10 rounded-md border border-slate-300 px-3 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {primaryPaymentTypeOptions.map((option) => (
                    <option key={`payment-type-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Reference Number
                <input
                  id="referenceNo"
                  value={form.referenceNo}
                  onChange={(event) => updateField('referenceNo', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <div />

              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Mode of Payment (2)
                <select id="paymentModeTwo" value={form.paymentModeTwo} onChange={(event) => onPaymentModeTwoChange(event.target.value as EncoderPaymentModeOption)} className="h-10 rounded-md border border-slate-300 px-3">
                  {secondaryPaymentModes.map((mode) => (
                    <option key={`mode-two-${mode}`} value={mode}>
                      {mode === 'AR(LEADERSUPPORT)' ? 'AR (LEADER SUPPORT)' : mode}
                    </option>
                  ))}
                </select>
                {paymentModeTwoError ? <span className="text-xs text-red-600">{paymentModeTwoError}</span> : null}
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Payment Mode Type (2)
                <select
                  id="paymentTypeTwo"
                  value={form.paymentTypeTwo}
                  onChange={(event) => updateField('paymentTypeTwo', event.target.value)}
                  disabled={secondaryTypeIsReadOnly}
                  className="h-10 rounded-md border border-slate-300 px-3 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {secondaryPaymentTypeOptions.map((option) => (
                    <option key={`payment-type-two-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Reference Number (2)
                <input
                  id="referenceNoTwo"
                  value={form.referenceNoTwo}
                  onChange={(event) => updateField('referenceNoTwo', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Amount (2)
                <input
                  id="salesTwo"
                  type="number"
                  min="0"
                  value={form.salesTwo}
                  onChange={(event) => updateNumericField('salesTwo', event.target.value, 'salesTwo')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Released (Bottle)
                <input
                  id="released"
                  type="number"
                  min="0"
                  value={form.released}
                  onChange={(event) => updateNumericField('released', event.target.value, 'released')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Released (Blister)
                <input
                  id="releasedBlpk"
                  type="number"
                  min="0"
                  value={form.releasedBlpk}
                  onChange={(event) => updateNumericField('releasedBlpk', event.target.value, 'releasedBlpk')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Follow (Bottle)
                <input
                  id="toFollow"
                  type="number"
                  min="0"
                  value={form.toFollow}
                  onChange={(event) => updateNumericField('toFollow', event.target.value, 'toFollow')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Follow (Blister)
                <input
                  id="toFollowBlpk"
                  type="number"
                  min="0"
                  value={form.toFollowBlpk}
                  onChange={(event) => updateNumericField('toFollowBlpk', event.target.value, 'toFollowBlpk')}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                Remarks
                <textarea
                  id="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={(event) => updateField('remarks', event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Received By
                <input
                  id="receivedBy"
                  value={form.receivedBy}
                  onChange={(event) => updateField('receivedBy', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Collected By
                <input
                  id="collectedBy"
                  value={form.collectedBy}
                  onChange={(event) => updateField('collectedBy', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="reset" variant="secondary">
                Clear Form
              </Button>
              <Button type="submit">Save Entry</Button>
            </div>
          </form>
        </Card>
      </section>

      {/* Dev test payload example:
          {
            "event_name":"DAVAO",
            "trans_date":"2026-02-27",
            "pof_number":"POF-TEST-0002",
            "member_name":"Test Member",
            "username":"tester01",
            "is_new_member":true,
            "package_type":"SILVER",
            "sales":4500
          }
      */}

      <Modal isOpen={isSavedOpen} title="Saved" onClose={() => setIsSavedOpen(false)}>
        Daily sales entry saved successfully (mock).
      </Modal>
    </>
  );
}
