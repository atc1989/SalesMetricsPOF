'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

type UsersNoZeroOneRow = {
  id: string;
  username: string;
  fullName: string;
  zeroOne: string;
  codePayment: 'PD' | 'FS';
};

type UserAccountRow = {
  id: string;
  fullName: string;
  username: string;
  sponsor: string;
  placement: string;
  group: string;
  accountType: string;
  zeroOne: string;
  codePayment: 'PD' | 'FS';
  barangay: string;
  city: string;
  province: string;
  region: string;
  country: string;
  dateCreated: string;
};

type UserAccountApiRow = {
  user_account_id: number | string;
  user_name: string | null;
  full_name: string | null;
  sponsor: string | null;
  placement: string | null;
  group: string | null;
  account_type: string | null;
  zero_one: string | null;
  code_payment: string | null;
  brgy: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  date_created: string | null;
};

type ModalNotice = {
  title: string;
  message: string;
};

const defaultZeroOneOptions = ['HeadEagle01', 'HERA01', 'Romar01', 'Ironman'];
const defaultCodePaymentOptions: Array<'PD' | 'FS'> = ['PD', 'FS'];

const matchesSearch = (values: Array<string | number>, search: string) =>
  values.join(' ').toLowerCase().includes(search);

const normalizeCodePayment = (value: string | null): 'PD' | 'FS' =>
  value?.toUpperCase() === 'PD' ? 'PD' : 'FS';

const mapApiRowToUserAccount = (row: UserAccountApiRow): UserAccountRow => ({
  id: String(row.user_account_id),
  fullName: row.full_name ?? '',
  username: row.user_name ?? '',
  sponsor: row.sponsor ?? '',
  placement: row.placement ?? '',
  group: row.group ?? '',
  accountType: row.account_type ?? '',
  zeroOne: row.zero_one ?? '',
  codePayment: normalizeCodePayment(row.code_payment),
  barangay: row.brgy ?? '',
  city: row.city ?? '',
  province: row.province ?? '',
  region: row.region ?? '',
  country: row.country ?? '',
  dateCreated: row.date_created?.slice(0, 10) ?? '',
});

const mapUserAccountToUsersNoZeroOne = (rows: UserAccountRow[]): UsersNoZeroOneRow[] =>
  rows.map((row) => ({
    id: `user-${row.id}`,
    username: row.username,
    fullName: row.fullName,
    zeroOne: row.zeroOne,
    codePayment: row.codePayment,
  }));

export function UsersTab() {
  const [usersRows, setUsersRows] = useState<UsersNoZeroOneRow[]>([]);
  const [rows, setRows] = useState<UserAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [isSyncingCodes, setIsSyncingCodes] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [zeroOneOptions, setZeroOneOptions] = useState<string[]>(defaultZeroOneOptions);
  const [zeroOne, setZeroOne] = useState('');
  const [codePayment, setCodePayment] = useState<'PD' | 'FS'>('PD');

  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [userAccountSearchQuery, setUserAccountSearchQuery] = useState('');
  const [notice, setNotice] = useState<ModalNotice | null>(null);

  const filteredUsersRows = useMemo(() => {
    const search = usersSearchQuery.trim().toLowerCase();
    const usersWithoutZeroOne = usersRows.filter((row) => row.zeroOne.trim().length === 0);
    if (!search) {
      return usersWithoutZeroOne;
    }

    return usersWithoutZeroOne.filter((row) =>
      matchesSearch([row.username, row.fullName, row.zeroOne, row.codePayment], search)
    );
  }, [usersRows, usersSearchQuery]);

  const filteredUserAccountRows = useMemo(() => {
    const search = userAccountSearchQuery.trim().toLowerCase();
    if (!search) {
      return rows;
    }

    return rows.filter((row) =>
      matchesSearch(
        [
          row.fullName,
          row.username,
          row.sponsor,
          row.placement,
          row.group,
          row.accountType,
          row.zeroOne,
          row.codePayment,
          row.barangay,
          row.city,
          row.province,
          row.region,
          row.country,
          row.dateCreated,
        ],
        search
      )
    );
  }, [rows, userAccountSearchQuery]);

  const loadUserAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({ limit: '200' });

      const response = await fetch(`/api/user-account?${params.toString()}`);
      const payload = (await response.json()) as {
        success: boolean;
        rows?: UserAccountApiRow[];
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.rows) {
        throw new Error(payload.message ?? 'Failed to load user accounts.');
      }

      const mappedUserAccounts = payload.rows.map((row) => mapApiRowToUserAccount(row));
      const mappedUsersNoZeroOne = mapUserAccountToUsersNoZeroOne(mappedUserAccounts);
      const mappedZeroOnes = Array.from(
        new Set(
          mappedUserAccounts
            .map((row) => row.zeroOne)
            .filter((value) => value.trim().length > 0)
        )
      );

      setRows(mappedUserAccounts);
      setUsersRows(mappedUsersNoZeroOne);
      if (mappedZeroOnes.length > 0) {
        setZeroOneOptions(mappedZeroOnes);
      }
    } catch {
      setRows([]);
      setUsersRows([]);
      setErrorMessage('Failed to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const buildZeroOneOptions = useCallback(
    (preferredValue = '') => {
      const existingValues = Array.from(
        new Set(rows.map((row) => row.zeroOne.trim()).filter((value) => value.length > 0))
      );

      if (preferredValue.trim().length > 0 && !existingValues.includes(preferredValue.trim())) {
        return [preferredValue.trim(), ...existingValues];
      }

      return existingValues.length > 0 ? existingValues : defaultZeroOneOptions;
    },
    [rows]
  );

  const resetUsersForm = useCallback(() => {
    setFullName('');
    setSelectedUserName('');
    setZeroOneOptions(buildZeroOneOptions());
    setZeroOne('');
    setCodePayment('PD');
  }, [buildZeroOneOptions]);

  const modifyUserZeroOne = async (username: string, name: string, nextZeroOne: string, nextCodePayment: 'PD' | 'FS') => {
    try {
      const response = await fetch('/api/user-account/modify-zero-one', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: username,
          zeroOne: nextZeroOne,
          codePayment: nextCodePayment,
        }),
      });
      const payload = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Failed to update user account.');
      }
    } catch {
      setNotice({
        title: 'Error',
        message: 'Failed to update user account.',
      });
      return;
    }

    setUsersRows((prev) =>
      prev.map((row) =>
        row.username === username || row.fullName === name
          ? { ...row, zeroOne: nextZeroOne, codePayment: nextCodePayment }
          : row
      )
    );

    setRows((prev) =>
      prev.map((row) =>
        row.username === username || row.fullName === name
          ? { ...row, zeroOne: nextZeroOne, codePayment: nextCodePayment }
          : row
      )
    );

    setNotice({
      title: 'Success',
      message: 'User zero-one updated successfully.',
    });
  };

  const syncUserAccounts = async () => {
    setIsSyncingUsers(true);
    try {
      await loadUserAccounts();
      resetUsersForm();
      setNotice({
        title: 'Success',
        message: 'Users synced from the database.',
      });
    } catch {
      setNotice({
        title: 'Error',
        message: 'Failed to sync users.',
      });
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const syncCodes = async () => {
    setIsSyncingCodes(true);
    try {
      const response = await fetch('/api/user-account/sync-codes', {
        method: 'POST',
      });
      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        syncedRows?: number;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Failed to sync codes.');
      }

      await loadUserAccounts();
      setNotice({
        title: 'Success',
        message: `Codes synced successfully. Updated ${payload.syncedRows ?? 0} users.`,
      });
    } catch (error) {
      setNotice({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to sync codes.',
      });
    } finally {
      setIsSyncingCodes(false);
    }
  };

  const onUsersFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUserName || !fullName || !zeroOne || !codePayment) {
      setNotice({
        title: 'Warning!',
        message: 'Please complete required user fields.',
      });
      return;
    }

    await modifyUserZeroOne(selectedUserName, fullName, zeroOne, codePayment);
  };

  const onUsersFormReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetUsersForm();
  };

  const onEditRow = (row: UsersNoZeroOneRow) => {
    setSelectedUserName(row.username);
    setFullName(row.fullName);
    setZeroOneOptions(buildZeroOneOptions(row.zeroOne));
    setZeroOne(row.zeroOne);
    setCodePayment(row.codePayment);
  };

  useEffect(() => {
    void loadUserAccounts();
  }, [loadUserAccounts]);

  const exportUserAccount = () => {
    const headers = [
      'Full Name',
      'username',
      'sponsor',
      'placement',
      'group',
      'Account Type',
      'Zero One',
      'Code Payment',
      'Barangay',
      'city',
      'province',
      'region',
      'country',
      'Date Created',
    ];

    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

    const lines = [
      headers.map((header) => escapeCsv(header)).join(','),
      ...filteredUserAccountRows.map((row) =>
        [
          row.fullName,
          row.username,
          row.sponsor,
          row.placement,
          row.group,
          row.accountType,
          row.zeroOne,
          row.codePayment,
          row.barangay,
          row.city,
          row.province,
          row.region,
          row.country,
          row.dateCreated,
        ]
          .map((value) => escapeCsv(value))
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user_accounts.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section id="users" className="mt-4 space-y-4">
        {errorMessage ? <p className="text-xs text-amber-700">{errorMessage}</p> : null}
        <Card className="p-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Users</h2>
          <form id="usersForm" className="grid gap-2 md:grid-cols-5" onSubmit={onUsersFormSubmit} onReset={onUsersFormReset}>
            <label className="flex flex-col text-xs font-medium text-slate-700">
              Full Name
              <input
                id="fullName"
                type="text"
                value={fullName}
                readOnly
                required
                className="mt-1 h-10 rounded border border-slate-300 bg-slate-50 px-3 text-sm"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-700">
              Zero One
              <select
                id="zeroOne"
                value={zeroOne}
                required
                onChange={(event) => setZeroOne(event.target.value)}
                className="mt-1 h-10 rounded border border-slate-300 px-3 text-sm"
              >
                <option value="">Select zero one</option>
                {zeroOneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-700">
              Code Payment
              <select
                id="codePayment"
                value={codePayment}
                required
                onChange={(event) => setCodePayment(event.target.value as 'PD' | 'FS')}
                className="mt-1 h-10 rounded border border-slate-300 px-3 text-sm"
              >
                {defaultCodePaymentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Button type="submit">Save Entry</Button>
              <Button type="reset" variant="secondary">
                Clear Form
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void syncUserAccounts()}
                disabled={isLoading || isSyncingUsers || isSyncingCodes}
              >
                {isSyncingUsers ? 'Syncing...' : 'Sync Users'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void syncCodes()}
                disabled={isLoading || isSyncingUsers || isSyncingCodes}
              >
                {isSyncingCodes ? 'Syncing...' : 'Sync Codes'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Users With No Zero One</h3>
            <input
              id="tblUsersSearch"
              type="text"
              value={usersSearchQuery}
              onChange={(event) => setUsersSearchQuery(event.target.value)}
              placeholder="Search table..."
              className="h-9 w-full max-w-xs rounded border border-slate-300 px-3 text-sm"
            />
          </div>
          <div className="app-table-scroll">
            <table id="tblUsers" className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">username</th>
                  <th className="px-3 py-2">name</th>
                  <th className="px-3 py-2">Zero One</th>
                  <th className="px-3 py-2">Code Payment</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredUsersRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No user rows found.
                    </td>
                  </tr>
                ) : (
                  filteredUsersRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{row.username}</td>
                      <td className="px-3 py-2">{row.fullName}</td>
                      <td className="px-3 py-2">{row.zeroOne}</td>
                      <td className="px-3 py-2">{row.codePayment}</td>
                      <td className="px-3 py-2">
                        <Button type="button" size="sm" variant="secondary" className="edit-user-btn" onClick={() => onEditRow(row)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">User Accounts</h3>
            <div className="flex w-full max-w-xl items-center gap-2">
              <input
                id="tblUserAccountSearch"
                type="text"
                value={userAccountSearchQuery}
                onChange={(event) => setUserAccountSearchQuery(event.target.value)}
                placeholder="Search table..."
                className="h-9 flex-1 rounded border border-slate-300 px-3 text-sm"
              />
              <Button id="exportUserAccount" type="button" size="sm" onClick={exportUserAccount}>
                CSV
              </Button>
            </div>
          </div>
          <div className="app-table-scroll">
            <table id="tblUserAccount" className="min-w-[1400px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">username</th>
                  <th className="px-3 py-2">sponsor</th>
                  <th className="px-3 py-2">placement</th>
                  <th className="px-3 py-2">group</th>
                  <th className="px-3 py-2">Account Type</th>
                  <th className="px-3 py-2">Zero One</th>
                  <th className="px-3 py-2">Code Payment</th>
                  <th className="px-3 py-2">Barangay</th>
                  <th className="px-3 py-2">city</th>
                  <th className="px-3 py-2">province</th>
                  <th className="px-3 py-2">region</th>
                  <th className="px-3 py-2">country</th>
                  <th className="px-3 py-2">Date Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUserAccountRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      No user account rows found.
                    </td>
                  </tr>
                ) : (
                  filteredUserAccountRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{row.fullName}</td>
                      <td className="px-3 py-2">{row.username}</td>
                      <td className="px-3 py-2">{row.sponsor}</td>
                      <td className="px-3 py-2">{row.placement}</td>
                      <td className="px-3 py-2">{row.group}</td>
                      <td className="px-3 py-2">{row.accountType}</td>
                      <td className="px-3 py-2">{row.zeroOne}</td>
                      <td className="px-3 py-2">{row.codePayment}</td>
                      <td className="px-3 py-2">{row.barangay}</td>
                      <td className="px-3 py-2">{row.city}</td>
                      <td className="px-3 py-2">{row.province}</td>
                      <td className="px-3 py-2">{row.region}</td>
                      <td className="px-3 py-2">{row.country}</td>
                      <td className="px-3 py-2">{row.dateCreated}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <Modal isOpen={Boolean(notice)} title={notice?.title ?? 'Notice'} onClose={() => setNotice(null)}>
        {notice?.message ?? ''}
      </Modal>
    </>
  );
}
