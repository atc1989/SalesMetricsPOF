"use client";

// Reusable date picker built on shadcn Popover + Calendar + Button.
// Accepts ISO date strings (YYYY-MM-DD) for value + onChange so it slots
// straight into the existing date-string state used by the filter rows
// in daily-sales tabs, inventory-movement, budget requests, PCF.

import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATE_FORMAT = "yyyy-MM-dd";

function parseISODate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

function formatISODate(date: Date | undefined): string {
  if (!date) return "";
  return format(date, DATE_FORMAT);
}

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  buttonClassName?: string;
  align?: "start" | "center" | "end";
  disabled?: boolean;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  id,
  className,
  buttonClassName,
  align = "start",
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISODate(value);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selected && "text-muted-foreground",
              buttonClassName,
            )}
          >
            <CalendarIcon className="size-4" />
            {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(next) => {
              onChange(formatISODate(next));
              setOpen(false);
            }}
            captionLayout="dropdown"
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
