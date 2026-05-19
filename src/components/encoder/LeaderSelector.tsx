"use client";

import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Leader } from "@/types/encoder";

type LeaderSelectorProps = {
  leaders: Leader[];
  availableLeaders: Leader[];
};

export function LeaderSelector({ leaders, availableLeaders }: LeaderSelectorProps) {
  const [leaderNameId, setLeaderNameId] = useState(leaders[0]?.id ?? "");
  const [availableLeaderId, setAvailableLeaderId] = useState(availableLeaders[0]?.id ?? "");
  const [zeroOne, setZeroOne] = useState(leaders[0]?.zeroOne ?? "");
  const [savedSelection, setSavedSelection] = useState({
    leaderNameId: leaders[0]?.id ?? "",
    availableLeaderId: availableLeaders[0]?.id ?? "",
    zeroOne: leaders[0]?.zeroOne ?? "",
  });
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const selectedLeader = useMemo(
    () => leaders.find((leader) => leader.id === savedSelection.leaderNameId),
    [leaders, savedSelection.leaderNameId],
  );
  const selectedAvailableLeader = useMemo(
    () => availableLeaders.find((leader) => leader.id === savedSelection.availableLeaderId),
    [availableLeaders, savedSelection.availableLeaderId],
  );

  const onLeaderNameChange = (nextLeaderId: string) => {
    const matchedLeader = leaders.find((leader) => leader.id === nextLeaderId);
    setLeaderNameId(nextLeaderId);
    if (matchedLeader) {
      setZeroOne(matchedLeader.zeroOne);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedSelection({ leaderNameId, availableLeaderId, zeroOne });
    setIsSuccessOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leader Section</CardTitle>
          <CardDescription>Assign a leader and their available bench for encoder routing.</CardDescription>
          {selectedLeader ? (
            <CardAction>
              <Badge variant="success">Leader: {selectedLeader.name}</Badge>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={onSubmit}>
            <FieldGroup className="flex-1">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="leaderName">Leader Name</FieldLabel>
                  <Select value={leaderNameId} onValueChange={onLeaderNameChange}>
                    <SelectTrigger id="leaderName" className="w-full">
                      <SelectValue placeholder="Select a leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="agent-avatar">Zero One</FieldLabel>
                  <Input
                    id="agent-avatar"
                    type="text"
                    value={zeroOne}
                    onChange={(event) => setZeroOne(event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="availableLeader">Available Leaders</FieldLabel>
                  <Select value={availableLeaderId} onValueChange={setAvailableLeaderId}>
                    <SelectTrigger id="availableLeader" className="w-full">
                      <SelectValue placeholder="Select an available leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLeaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>
            <div>
              <Button type="submit">Save Leader</Button>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Saved selection: {selectedLeader?.name ?? "N/A"} ({savedSelection.zeroOne || "—"}) ·
            Available: {selectedAvailableLeader?.name ?? "N/A"}
          </p>
        </CardFooter>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Leader settings saved successfully (mock).
      </Modal>
    </>
  );
}
