'use client';

import { FormEvent, useMemo, useState } from 'react';
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

type ModalNotice = {
  title: string;
  message: string;
};

const defaultZeroOneOptions = ['HeadEagle01', 'HERA01', 'Romar01', 'Ironman'];
const defaultCodePaymentOptions: Array<'PD' | 'FS'> = ['PD', 'FS'];

const initialUsersRows: UsersNoZeroOneRow[] = [
  {
    id: 'usr-001',
    username: 'Amazinggrace01',
    fullName: 'Ozarraga, Jevelyn',
    zeroOne: 'HeadEagle01',
    codePayment: 'FS',
  },
  {
    id: 'usr-002',
    username: 'airyne24',
    fullName: 'Airyne Dytes Obalag',
    zeroOne: 'HeadEagle01',
    codePayment: 'PD',
  },
  {
    id: 'usr-003',
    username: 'jane.cruz',
    fullName: 'Jane Cruz',
    zeroOne: 'HERA01',
    codePayment: 'FS',
  },
  {
    id: 'usr-004',
    username: 'mark.v',
    fullName: 'Mark Villanueva',
    zeroOne: 'Romar01',
    codePayment: 'PD',
  },
];

const initialUserAccountRows: UserAccountRow[] = [
  {
    id: 'uac-001',
    fullName: 'Ozarraga, Jevelyn',
    username: 'Amazinggrace01',
    sponsor: 'HeadEagle01',
    placement: 'Left',
    group: 'A',
    accountType: 'Distributor',
    zeroOne: 'HeadEagle01',
    codePayment: 'FS',
    barangay: 'Poblacion',
    city: 'Davao City',
    province: 'Davao del Sur',
    region: 'Region XI',
    country: 'Philippines',
    dateCreated: '2025-04-01',
  },
  {
    id: 'uac-002',
    fullName: 'Airyne Dytes Obalag',
    username: 'airyne24',
    sponsor: 'HeadEagle01',
    placement: 'Right',
    group: 'A',
    accountType: 'Distributor',
    zeroOne: 'HeadEagle01',
    codePayment: 'PD',
    barangay: 'Talomo',
    city: 'Davao City',
    province: 'Davao del Sur',
    region: 'Region XI',
    country: 'Philippines',
    dateCreated: '2025-04-03',
  },
  {
    id: 'uac-003',
    fullName: 'Jane Cruz',
    username: 'jane.cruz',
    sponsor: 'HERA01',
    placement: 'Left',
    group: 'B',
    accountType: 'Stockist',
    zeroOne: 'HERA01',
    codePayment: 'FS',
    barangay: 'Catalunan',
    city: 'Davao City',
    province: 'Davao del Sur',
    region: 'Region XI',
    country: 'Philippines',
    dateCreated: '2025-04-04',
  },
  {
    id: 'uac-004',
    fullName: 'Mark Villanueva',
    username: 'mark.v',
    sponsor: 'Romar01',
    placement: 'Right',
    group: 'C',
    accountType: 'Center',
    zeroOne: 'Romar01',
    codePayment: 'PD',
    barangay: 'Buhangin',
    city: 'Davao City',
    province: 'Davao del Sur',
    region: 'Region XI',
    country: 'Philippines',
    dateCreated: '2025-04-05',
  },
];

const uplinesByUsername: Record<string, Array<{ user_name: string }>> = {
  Amazinggrace01: [{ user_name: 'KRAKEN01' }, { user_name: 'marband' }, { user_name: 'Ironman' }],
  airyne24: [{ user_name: 'HeadEagle01' }, { user_name: 'Romar01' }],
  'jane.cruz': [{ user_name: 'HERA01' }, { user_name: 'KRAKEN01' }],
  'mark.v': [{ user_name: 'Romar01' }, { user_name: 'marband' }],
};

const userCodesByUsername: Record<string, { code_payment: string }> = {
  Amazinggrace01: { code_payment: 'FREE' },
  airyne24: { code_payment: 'PAID' },
  'jane.cruz': { code_payment: 'FREE' },
  'mark.v': { code_payment: 'PAID' },
};

const mapUplineUsername = (value: string) => {
  if (value === 'KRAKEN01') {
    return 'HERA01';
  }

  if (value === 'marband') {
    return 'joyann';
  }

  return value;
};

const matchesSearch = (values: Array<string | number>, search: string) =>
  values.join(' ').toLowerCase().includes(search);

export function UsersTab() {
  const [usersRows, setUsersRows] = useState<UsersNoZeroOneRow[]>(initialUsersRows);
  const [userAccountRows, setUserAccountRows] = useState<UserAccountRow[]>(initialUserAccountRows);

  const [fullName, setFullName] = useState('Ozarraga, Jevelyn');
  const [zeroOneOptions, setZeroOneOptions] = useState<string[]>(defaultZeroOneOptions);
  const [zeroOne, setZeroOne] = useState('HeadEagle01');
  const [codePayment, setCodePayment] = useState<'PD' | 'FS'>('PD');

  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [userAccountSearchQuery, setUserAccountSearchQuery] = useState('');
  const [notice, setNotice] = useState<ModalNotice | null>(null);

  const filteredUsersRows = useMemo(() => {
    const search = usersSearchQuery.trim().toLowerCase();
    if (!search) {
      return usersRows;
    }

    return usersRows.filter((row) =>
      matchesSearch([row.username, row.fullName, row.zeroOne, row.codePayment], search)
    );
  }, [usersRows, usersSearchQuery]);

  const filteredUserAccountRows = useMemo(() => {
    const search = userAccountSearchQuery.trim().toLowerCase();
    if (!search) {
      return userAccountRows;
    }

    return userAccountRows.filter((row) =>
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
  }, [userAccountRows, userAccountSearchQuery]);

  const getUserAccountNoZeroOne = () => {
    setUsersRows((prev) => [...prev]);
  };

  const getAllUserAccount = () => {
    setUserAccountRows((prev) => [...prev]);
  };

  const getUserCodes = (username: string) => {
    const code = userCodesByUsername[username]?.code_payment;
    if (code === 'PAID') {
      setCodePayment('PD');
    } else {
      setCodePayment('FS');
    }
  };

  const getUnilevelUplines = (username: string) => {
    const uplines = uplinesByUsername[username] ?? [];
    const mappedOptions = uplines.map((entry) => mapUplineUsername(entry.user_name));
    const nextOptions = mappedOptions.length > 0 ? Array.from(new Set(mappedOptions)) : defaultZeroOneOptions;

    setZeroOneOptions(nextOptions);
    setZeroOne(nextOptions[0] ?? 'HeadEagle01');
    getUserCodes(username);
  };

  const resetUsersForm = () => {
    setFullName('Ozarraga, Jevelyn');
    setZeroOneOptions(defaultZeroOneOptions);
    setZeroOne('HeadEagle01');
    setCodePayment('PD');
  };

  const modifyUserZeroOne = (name: string, nextZeroOne: string, nextCodePayment: 'PD' | 'FS') => {
    setUsersRows((prev) =>
      prev.map((row) => (row.fullName === name ? { ...row, zeroOne: nextZeroOne, codePayment: nextCodePayment } : row))
    );

    setUserAccountRows((prev) =>
      prev.map((row) =>
        row.fullName === name ? { ...row, zeroOne: nextZeroOne, codePayment: nextCodePayment } : row
      )
    );

    setNotice({
      title: 'Success',
      message: 'User zero-one updated successfully (mock).',
    });
  };

  const syncUserAccounts = () => {
    getUserAccountNoZeroOne();
    setNotice({
      title: 'Success',
      message: 'User accounts synchronized successfully (mock).',
    });
  };

  const syncCodes = () => {
    getUserAccountNoZeroOne();
    setNotice({
      title: 'Success',
      message: 'User codes synchronized successfully (mock).',
    });
  };

  const onUsersFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName || !zeroOne || !codePayment) {
      setNotice({
        title: 'Warning!',
        message: 'Please complete required user fields.',
      });
      return;
    }

    modifyUserZeroOne(fullName, zeroOne, codePayment);
    getUserAccountNoZeroOne();
    getAllUserAccount();
  };

  const onUsersFormReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetUsersForm();
  };

  const onEditRow = (row: UsersNoZeroOneRow) => {
    setFullName(row.fullName);
    getUnilevelUplines(row.username);
  };

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
    link.download = 'user_accounts.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section id="users" className="mt-4 space-y-4">
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
              <Button type="button" variant="secondary" onClick={syncUserAccounts}>
                Sync Users
              </Button>
              <Button type="button" variant="secondary" onClick={syncCodes}>
                Sync Codes
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
          <div className="overflow-x-auto">
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
                Excel
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
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
                {filteredUserAccountRows.length === 0 ? (
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
