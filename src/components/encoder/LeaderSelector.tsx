"use client";

import { FormEvent, useMemo, useState } from "react";
import { Leader } from "@/types/encoder";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
    [leaders, savedSelection.leaderNameId]
  );
  const selectedAvailableLeader = useMemo(
    () => availableLeaders.find((leader) => leader.id === savedSelection.availableLeaderId),
    [availableLeaders, savedSelection.availableLeaderId]
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
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Leader Section</h3>
          {selectedLeader ? <Badge variant="success">Leader: {selectedLeader.name}</Badge> : null}
        </div>

        <form className="grid gap-3 sm:grid-cols-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Leader Name
            <select
              value={leaderNameId}
              onChange={(event) => onLeaderNameChange(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            >
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Zero One
            <input
              id="agent-avatar"
              type="text"
              value={zeroOne}
              onChange={(event) => setZeroOne(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Available Leaders
            <select
              value={availableLeaderId}
              onChange={(event) => setAvailableLeaderId(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            >
              {availableLeaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button type="submit">Save Leader</Button>
          </div>
        </form>

        <p className="mt-3 text-sm text-slate-600">
          Saved selection: {selectedLeader?.name ?? "N/A"} ({savedSelection.zeroOne}) | Available:{" "}
          {selectedAvailableLeader?.name ?? "N/A"}
        </p>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Leader settings saved successfully (mock).
      </Modal>
    </>
  );
}
