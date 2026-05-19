"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { TargetRatio } from "@/types/encoder";

type TargetRatioFormProps = {
  initialValue: TargetRatio;
};

export function TargetRatioForm({ initialValue }: TargetRatioFormProps) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedValue(value);
    setIsSuccessOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Target Ratio</CardTitle>
          <CardDescription>
            Set the global, package, and retail target ratios used in encoder calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={onSubmit}>
            <FieldGroup className="flex-1">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="globalTargetRatio">Global Target Ratio</FieldLabel>
                  <Input
                    id="globalTargetRatio"
                    type="number"
                    min="0"
                    value={value.globalTargetRatio}
                    onChange={(event) =>
                      setValue((prev) => ({
                        ...prev,
                        globalTargetRatio: Number(event.target.value),
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="packagePercent">Package %</FieldLabel>
                  <Input
                    id="packagePercent"
                    type="number"
                    min="0"
                    max="100"
                    value={value.package}
                    onChange={(event) =>
                      setValue((prev) => ({ ...prev, package: Number(event.target.value) }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="retailPercent">Retail %</FieldLabel>
                  <Input
                    id="retailPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={value.retail}
                    onChange={(event) =>
                      setValue((prev) => ({ ...prev, retail: Number(event.target.value) }))
                    }
                  />
                </Field>
              </div>
            </FieldGroup>
            <div>
              <Button type="submit">Save Ratio</Button>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Saved: Global {savedValue.globalTargetRatio}% · Package {savedValue.package}% · Retail{" "}
            {savedValue.retail}%
          </p>
        </CardFooter>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Target ratio saved successfully (mock).
      </Modal>
    </>
  );
}
