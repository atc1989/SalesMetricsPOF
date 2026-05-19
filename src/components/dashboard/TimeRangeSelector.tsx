"use client";

import { TimeRange } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

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
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={value}
          onValueChange={(v) => v && onChange(v as TimeRange)}
        >
          {ranges.map((range) => (
            <ToggleGroupItem key={range.value} value={range.value}>
              {range.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="h-8 w-[330px] overflow-hidden sm:w-[360px]">
          <div
            aria-hidden={!isCustom}
            className={cn(
              "flex h-8 items-center gap-2 transition-all duration-200 ease-out",
              isCustom
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-1 opacity-0",
            )}
          >
            <label htmlFor="custom-start-date" className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                FROM
              </span>
              <Input
                id="custom-start-date"
                type="date"
                value={customStartDate}
                onChange={(event) => onCustomStartDateChange(event.target.value)}
                className="h-8 w-[145px]"
              />
            </label>
            <label htmlFor="custom-end-date" className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                TO
              </span>
              <Input
                id="custom-end-date"
                type="date"
                value={customEndDate}
                onChange={(event) => onCustomEndDateChange(event.target.value)}
                className="h-8 w-[145px]"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
