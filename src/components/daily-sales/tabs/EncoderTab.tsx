'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
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

const packageBottleCounts: Record<EncoderPackageTypeOption, number> = {
  SILVER: 1,
  GOLD: 3,
  PLATINUM: 10,
  RETAIL: 1,
  BLISTER: 1,
};

const packagePricesByType: Record<EncoderPackageTypeOption, number> = {
  SILVER: 3500,
  GOLD: 10500,
  PLATINUM: 35000,
  RETAIL: 3800,
  BLISTER: 1299,
};

const discountMatrix: Record<EncoderMemberTypeOption, Record<EncoderPackageTypeOption, number>> = {
  DISTRIBUTOR: {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    RETAIL: 1520,
    BLISTER: 520,
  },
  STOCKIST: {
    SILVER: 50,
    GOLD: 150,
    PLATINUM: 500,
    RETAIL: 1710,
    BLISTER: 585,
  },
  CENTER: {
    SILVER: 80,
    GOLD: 240,
    PLATINUM: 800,
    RETAIL: 1900,
    BLISTER: 650,
  },
  'NON-MEMBER': {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    RETAIL: 0,
    BLISTER: 0,
  },
};

const defaultBlisterByPackageType: Record<EncoderPackageTypeOption, EncoderBlisterOption> = {
  SILVER: '1',
  GOLD: '0',
  PLATINUM: '0',
  RETAIL: '0',
  BLISTER: '1',
};

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

const today = new Date().toISOString().slice(0, 10);

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
  return {
    ...current,
    memberType,
    packageType,
    originalPrice: packagePricesByType[packageType],
    discount: discountMatrix[memberType][packageType],
    isToBlister: defaultBlisterByPackageType[packageType],
  };
}

const buildInitialForm = (): EncoderFormModel => {
  const base: EncoderFormModel = {
    event: 'DAVAO',
    date: today,
    pofNumber: '',
    name: '',
    username: '',
    newMember: '1',
    memberType: 'DISTRIBUTOR',
    packageType: 'SILVER',
    isToBlister: '1',
    originalPrice: packagePricesByType.SILVER,
    quantity: 1,
    blisterCount: 0,
    discount: 0,
    price: packagePricesByType.SILVER,
    oneTimeDiscount: 0,
    noOfBottles: 1,
    sales: packagePricesByType.SILVER,
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
  const blisterCount = input.isToBlister === '1' ? quantity * 10 : 0;
  const noOfBottles = quantity * packageBottleCounts[input.packageType];
  const sales = manualOverrides.sales ? input.sales : Math.max(price * quantity - oneTimeDiscount, 0);
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
    salesTwo: normalizedSalesTwo,
  };
};

type NumericField =
  | 'quantity'
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
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [paymentModeTwoError, setPaymentModeTwoError] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const primaryPaymentTypeOptions = useMemo(() => getPaymentTypeOptions(form.paymentMode), [form.paymentMode]);
  const secondaryPaymentTypeOptions = useMemo(() => getPaymentTypeOptions(form.paymentModeTwo), [form.paymentModeTwo]);
  const primaryTypeIsReadOnly = primaryPaymentTypeOptions.length === 1 && primaryPaymentTypeOptions[0].value === 'N/A';
  const secondaryTypeIsReadOnly = secondaryPaymentTypeOptions.length === 1 && secondaryPaymentTypeOptions[0].value === 'N/A';
  const resetForm = () => {
    setForm(applyComputedFields(buildInitialForm(), initialManualOverrides));
    setManualOverrides(initialManualOverrides);
    setPaymentModeTwoError('');
  };

  const updateField = <K extends keyof EncoderFormModel>(key: K, value: EncoderFormModel[K]) => {
    setForm((prev) => applyComputedFields({ ...prev, [key]: value }, manualOverrides));
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
                  onChange={(event) => updateField('date', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                POF Number
                <input
                  id="pofNumber"
                  value={form.pofNumber}
                  onChange={(event) => updateField('pofNumber', event.target.value)}
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
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
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
                  <option value="CENTER">Center</option>
                  <option value="NON-MEMBER">Non-member</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Package Type
                <select id="packageType" value={form.packageType} onChange={(event) => onPackageTypeChange(event.target.value as EncoderPackageTypeOption)} className="h-10 rounded-md border border-slate-300 px-3">
                  <option value="SILVER">Silver (1 bottle)</option>
                  <option value="GOLD">Gold (3 bottles)</option>
                  <option value="PLATINUM">Platinum (10 bottles)</option>
                  <option value="RETAIL">Retail (1 bottle)</option>
                  <option value="BLISTER">Blister (1 blister pack)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Blister?
                <select
                  id="isToBlister"
                  value={form.isToBlister}
                  onChange={(event) => updateField('isToBlister', event.target.value as EncoderBlisterOption)}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
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
                  value={form.blisterCount}
                  readOnly
                  className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3"
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
                  {discountOptions.map((option) => (
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
                  readOnly={primaryTypeIsReadOnly}
                  onChange={(event) => updateField('referenceNo', event.target.value)}
                  className={`h-10 rounded-md border border-slate-300 px-3 ${primaryTypeIsReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
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
                  readOnly={secondaryTypeIsReadOnly}
                  onChange={(event) => updateField('referenceNoTwo', event.target.value)}
                  className={`h-10 rounded-md border border-slate-300 px-3 ${secondaryTypeIsReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
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
            "sales":3500
          }
      */}

      <Modal isOpen={isSavedOpen} title="Saved" onClose={() => setIsSavedOpen(false)}>
        Daily sales entry saved successfully (mock).
      </Modal>
    </>
  );
}
