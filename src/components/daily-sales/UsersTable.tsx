"use client";

import { useState } from "react";
import { UserRow } from "@/types/users";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";

type UsersTableProps = {
  rows: UserRow[];
};

export function UsersTable({ rows }: UsersTableProps) {
  const [stateRows, setStateRows] = useState(rows);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const updateZeroOne = (id: string, value: 0 | 1) => {
    setStateRows((prev) => prev.map((row) => (row.id === id ? { ...row, noZeroOne: value } : row)));
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Users</h3>
        <div className="app-table-scroll">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-slate-200 px-4 py-2 text-left">Name</th>
                <th className="border-b border-slate-200 px-4 py-2 text-left">Role</th>
                <th className="border-b border-slate-200 px-4 py-2 text-left">No-Zero-One</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-4 py-2">{row.name}</td>
                  <td className="border-b border-slate-100 px-4 py-2">{row.role}</td>
                  <td className="border-b border-slate-100 px-4 py-2">
                    <select
                      className="h-9 rounded-md border border-slate-300 px-2"
                      value={row.noZeroOne}
                      onChange={(event) => updateZeroOne(row.id, Number(event.target.value) as 0 | 1)}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => setIsSuccessOpen(true)}>Save</Button>
        </div>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        User no-zero-one values saved successfully (mock).
      </Modal>
    </>
  );
}
