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
  EncoderBagTypeOption,
  EncoderBlisterOption,
  EncoderFormModel,
  EncoderMarketingToolOption,
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

const bagTypeOptions: Array<{ label: string; value: EncoderBagTypeOption }> = [
  { label: 'N/A', value: 'N/A' },
  { label: 'Silver bag', value: 'SILVER_BAG' },
  { label: 'Blue bag', value: 'BLUE_BAG' },
];

const marketingToolOptions: Array<{ label: string; value: EncoderMarketingToolOption }> = [
  { label: 'N/A', value: 'N/A' },
  { label: 'Brochure', value: 'BROCHURE' },
  { label: 'Trifold', value: 'TRIFOLD' },
  { label: 'Flyers', value: 'FLYERS' },
  { label: 'Tumbler', value: 'TUMBLER' },
];

const discountOptions: Array<{ label: string; value: number }> = [
  { label: 'No Discount', value: 0 },
  { label: 'P50', value: 50 },
  { label: 'P150', value: 150 },
  { label: 'P500', value: 500 },
  { label: 'P240', value: 240 },
  { label: 'P1748', value: 1748 },
  { label: '40% (P1,520)', value: 1520 },
  { label: '45% (P1,710)', value: 1710 },
  { label: '50% (P1,900)', value: 1900 },
  { label: '40% (P520)', value: 520 },
  { label: '45% (P585)', value: 585 },
  { label: '47.5% (P618)', value: 618 },
  { label: '50% (P650)', value: 650 },
];

const encoderDiscountOptions: Array<{ label: string; value: number }> = [
  { label: 'No Discount', value: 0 },
  { label: 'Mobile - P50', value: 50 },
  { label: 'Mobile - P100', value: 100 },
  { label: 'Mobile - P150', value: 150 },
  { label: 'City - P180', value: 180 },
  { label: 'Blister - P195', value: 195 },
  { label: 'Blister - P227', value: 227 },
  { label: 'Center - P240', value: 240 },
  { label: 'Blister - P260', value: 260 },
  { label: 'Blister - P325', value: 325 },
  { label: 'Mobile - P350', value: 350 },
  { label: 'Blister - P357', value: 357 },
  { label: 'City - P360', value: 360 },
  { label: 'Bottle - P380', value: 380 },
  { label: 'Blister - P390', value: 390 },
  { label: 'Mobile - P450', value: 450 },
  { label: 'Center - P480', value: 480 },
  { label: 'Mobile - P500', value: 500 },
  { label: 'Bottle - P760', value: 760 },
  { label: 'City - P540', value: 540 },
  { label: 'Bottle - P570', value: 570 },
  { label: 'Blister - P617', value: 617 },
  { label: 'Blister - P649', value: 649 },
  { label: 'Blister - P650', value: 650 },
  { label: 'Bottle - P665', value: 665 },
  { label: 'Center - P720', value: 720 },
  { label: 'Distributor - P1748', value: 1748 },
  { label: 'Bottle - P1045', value: 1045 },
  { label: 'Bottle - P1140', value: 1140 },
  { label: 'City - P1260', value: 1260 },
  { label: 'Bottle - P1520', value: 1520 },
  { label: 'City - P1620', value: 1620 },
  { label: 'Center - P1680', value: 1680 },
  { label: 'Bottle - P1710', value: 1710 },
  { label: 'City - P1800', value: 1800 },
  { label: 'Bottle - P1805', value: 1805 },
  { label: 'Bottle - P1900', value: 1900 },
  { label: 'Center - P2160', value: 2160 },
  { label: 'Center - P2400', value: 2400 },
  { label: 'Blister - P520', value: 520 },
  { label: 'Blister - P585', value: 585 },
  { label: 'Blister - P618', value: 618 },
];

void discountOptions;

const today = new Date().toISOString().slice(0, 10);

type UserSearchResult = {
  username: string;
  memberName: string;
};

type NextPofResponse = {
  success?: boolean;
  data?: {
    pofNumber?: string;
  };
  message?: string;
};

async function fetchNextPofNumber(date: string) {
  const response = await fetch(`/api/daily-sales/next-pof?date=${encodeURIComponent(date)}`);
  const payload = (await response.json()) as NextPofResponse;

  if (!response.ok || !payload.success || !payload.data?.pofNumber) {
    throw new Error(payload.message ?? 'Unable to generate next POF number.');
  }

  return payload.data.pofNumber;
}

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
    bagType: 'N/A',
    bagQuantity: 0,
    marketingTool: 'N/A',
    marketingQuantity: 0,
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

function resetDerivedOverrides(overrides: ManualOverrides): ManualOverrides {
  return {
    ...overrides,
    blisterCount: false,
    price: false,
    sales: false,
    released: false,
    releasedBlpk: false,
  };
}

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
  | 'bagQuantity'
  | 'marketingQuantity'
  | 'released'
  | 'releasedBlpk'
  | 'toFollow'
  | 'toFollowBlpk'
  | 'salesTwo';

function buildSupplementaryEntries(form: EncoderFormModel) {
  const baseEntry = {
    event_name: form.event,
    trans_date: form.date,
    pof_number: form.pofNumber,
    member_name: form.name,
    username: form.username,
    is_new_member: form.newMember === '1',
    member_type: form.memberType,
    original_price: 0,
    is_to_blister: false,
    blister_count: 0,
    discount: 0,
    price_after_discount: 0,
    one_time_discount: 0,
    bottle_count: 0,
    released_count: 0,
    released_blpk_count: 0,
    to_follow_count: 0,
    to_follow_blpk_count: 0,
    sales: 0,
    mode_of_payment: null,
    payment_type: null,
    reference_number: null,
    sales_two: 0,
    mode_of_payment_two: null,
    payment_type_two: null,
    reference_number_two: null,
    remarks: form.remarks,
    received_by: form.receivedBy,
    collected_by: form.collectedBy,
    fullfilment_date: form.date,
  };

  const entries: Array<Record<string, unknown>> = [];

  if (form.bagType !== 'N/A' && form.bagQuantity > 0) {
    entries.push({
      ...baseEntry,
      package_type: form.bagType,
      quantity: form.bagQuantity,
    });
  }

  if (form.marketingTool !== 'N/A' && form.marketingQuantity > 0) {
    entries.push({
      ...baseEntry,
      package_type: form.marketingTool,
      quantity: form.marketingQuantity,
    });
  }

  return entries;
}

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
  const isZeroDiscountPackage = form.packageType.startsWith('OLD_');

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
    let isCancelled = false;

    const syncInitialPof = async () => {
      try {
        const nextPofNumber = await fetchNextPofNumber(today);

        if (!isCancelled) {
          setForm((prev) => applyComputedFields({ ...prev, pofNumber: nextPofNumber }, initialManualOverrides));
        }
      } catch {
        // Keep the date-based fallback if next POF lookup fails.
      }
    };

    void syncInitialPof();

    return () => {
      isCancelled = true;
    };
  }, []);

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

    if (!isPofManuallyEdited) {
      const pendingAutoPof = formatPofBaseFromDate(value);

      void fetchNextPofNumber(value)
        .then((nextPofNumber) => {
          setForm((prev) => {
            if (prev.date !== value || prev.pofNumber !== pendingAutoPof) {
              return prev;
            }

            return applyComputedFields({ ...prev, pofNumber: nextPofNumber }, manualOverrides);
          });
        })
        .catch(() => {
          // Leave the date-based fallback in place if lookup fails.
        });
    }
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
      extra_entries: buildSupplementaryEntries(form),
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

      const nextPofNumber = await fetchNextPofNumber(form.date).catch(() => null);
      setIsSavedOpen(true);
      resetForm();
      if (nextPofNumber) {
        setForm((prev) => applyComputedFields({ ...prev, pofNumber: nextPofNumber }, initialManualOverrides));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save daily sales entry.');
    }
  };

  const onReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetForm();
  };

  const onMemberTypeChange = (value: EncoderMemberTypeOption) => {
    const nextOverrides = resetDerivedOverrides(manualOverrides);
    setManualOverrides(nextOverrides);
    setForm((prev) => applyComputedFields(applyMemberPackageRules(prev, value, prev.packageType), nextOverrides));
  };

  const onPackageTypeChange = (value: EncoderPackageTypeOption) => {
    const nextOverrides = resetDerivedOverrides(manualOverrides);
    setManualOverrides(nextOverrides);
    setForm((prev) =>
      applyComputedFields(
        {
          ...applyMemberPackageRules(prev, prev.memberType, value),
          discount: value.startsWith('OLD_') ? 0 : dailySalesDiscountMatrix[prev.memberType][value],
        },
        nextOverrides,
      ),
    );
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

  const onBagTypeChange = (value: EncoderBagTypeOption) => {
    setForm((prev) =>
      applyComputedFields(
        {
          ...prev,
          bagType: value,
          bagQuantity: value === 'N/A' ? 0 : prev.bagQuantity,
        },
        manualOverrides,
      ),
    );
  };

  const onMarketingToolChange = (value: EncoderMarketingToolOption) => {
    setForm((prev) =>
      applyComputedFields(
        {
          ...prev,
          marketingTool: value,
          marketingQuantity: value === 'N/A' ? 0 : prev.marketingQuantity,
        },
        manualOverrides,
      ),
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
                {isUserSearchLoading ? <span className="text-xs text-slate-500">Searching users...</span> : null}
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
                  disabled={isZeroDiscountPackage}
                  className="h-10 rounded-md border border-slate-300 px-3 disabled:bg-slate-50"
                >
                  {encoderDiscountOptions.map((option) => (
                    <option key={`discount-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isZeroDiscountPackage ? (
                  <span className="text-xs text-slate-500">Old package types do not allow discounts.</span>
                ) : null}
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
                Bag Type
                <select
                  id="bagType"
                  value={form.bagType}
                  onChange={(event) => onBagTypeChange(event.target.value as EncoderBagTypeOption)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  {bagTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Bag Quantity
                <input
                  id="bagQuantity"
                  type="number"
                  min="0"
                  value={form.bagQuantity}
                  onChange={(event) => updateNumericField('bagQuantity', event.target.value)}
                  disabled={form.bagType === 'N/A'}
                  className="h-10 rounded-md border border-slate-300 px-3 disabled:bg-slate-50"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Marketing Tool
                <select
                  id="marketingTool"
                  value={form.marketingTool}
                  onChange={(event) => onMarketingToolChange(event.target.value as EncoderMarketingToolOption)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  {marketingToolOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Marketing Quantity
                <input
                  id="marketingQuantity"
                  type="number"
                  min="0"
                  value={form.marketingQuantity}
                  onChange={(event) => updateNumericField('marketingQuantity', event.target.value)}
                  disabled={form.marketingTool === 'N/A'}
                  className="h-10 rounded-md border border-slate-300 px-3 disabled:bg-slate-50"
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
        Daily sales entry saved successfully.
      </Modal>
    </>
  );
}
