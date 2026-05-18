"use client";

import { TimeRange } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

type TimeRangeSelectorProps = {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
};

const ranges: { label: string; value: TimeRange }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
];

export function TimeRangeSelector({
  value,
  onChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: TimeRangeSelectorProps) {
  const isCustom = value === "custom";

  return (
    <div className="w-full lg:w-auto">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ranges.map((range) => (
          <Button key={range.value} variant={range.value === value ? "default" : "secondary"} size="sm" onClick={() => onChange(range.value)}>
            {range.label}
          </Button>
        ))}
        <div className="h-8 w-[330px] overflow-hidden sm:w-[360px]">
          <div
            aria-hidden={!isCustom}
            className={`flex h-8 items-center gap-2 transition-all duration-200 ease-out ${
              isCustom ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
            }`}
          >
            <label htmlFor="custom-start-date" className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-slate-500">FROM</span>
              <input
                id="custom-start-date"
                type="date"
                value={customStartDate}
                onChange={(event) => onCustomStartDateChange(event.target.value)}
                className="h-8 w-[145px] rounded-md border border-slate-300 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
            <label htmlFor="custom-end-date" className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-slate-500">TO</span>
              <input
                id="custom-end-date"
                type="date"
                value={customEndDate}
                onChange={(event) => onCustomEndDateChange(event.target.value)}
                className="h-8 w-[145px] rounded-md border border-slate-300 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
