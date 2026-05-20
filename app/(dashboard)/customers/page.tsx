'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomPagination } from '@/components/ui/common/CustomPagination';

const PAGE_SIZE = 10;
const CUSTOMER_TAG_OPTIONS = [
  'Boiler Customer',
  'Bathroom Lead',
  'Heat Pump Quote',
  'Annual Service Reminder',
] as const;

type CustomerItem = {
  _id: string;
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  gender?: string;
  phoneNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  address?: string;
  tag?: string;
  customerTag?: string;
  status?: string;
  verifiedForget?: boolean;
  stripeAccountId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse = {
  success?: boolean;
  status?: boolean;
  statusCode?: number;
  message?: string;
  data?: unknown;
  meta?: unknown;
};

type CreateCustomerPayload = {
  fullName: string;
  email: string;
  password: string;
  role: string;
  gender: string;
  phoneNumber: string;
  dateOfBirth: string;
  country: string;
  city: string;
  address: string;
  tag: string;
  verifiedForget: string;
  status: string;
  stripeAccountId: string;
};

type CustomerFormProps = {
  onBack: () => void;
  onSubmit: (payload: CreateCustomerPayload) => Promise<void>;
  onCsvUpload: (file: File) => Promise<boolean>;
  isSubmitting: boolean;
  isCsvUploading: boolean;
};

const getApiBase = () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

const resolveUserCollectionEndpoint = () => {
  const apiBase = getApiBase();

  if (!apiBase) {
    return '/api/v1/user';
  }

  return apiBase.endsWith('/api/v1')
    ? `${apiBase}/user`
    : `${apiBase}/api/v1/user`;
};

const resolveUserDeleteEndpoint = (id: string) => `${resolveUserCollectionEndpoint()}/${id}`;

const resolveUserListEndpoint = (page: number, limit: number) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return `${resolveUserCollectionEndpoint()}?${params.toString()}`;
};

const normalizePostcode = (value: string) =>
  value.toUpperCase().replace(/\s+/g, ' ').trim();

const resolvePostcodeLookupEndpoint = (postcode: string) => {
  const encodedPostcode = encodeURIComponent(postcode);
  const apiBase = getApiBase();

  if (!apiBase) {
    return `/api/v1/postcode/${encodedPostcode}/addresses`;
  }

  return apiBase.endsWith('/api/v1')
    ? `${apiBase}/postcode/${encodedPostcode}/addresses`
    : `${apiBase}/api/v1/postcode/${encodedPostcode}/addresses`;
};

const buildAddressFromObject = (record: Record<string, unknown>) => {
  const directKeys = [
    'fullAddress',
    'full_address',
    'address',
    'formattedAddress',
    'formatted_address',
    'displayAddress',
  ];

  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const parts = [
    record.addressLine1,
    record.addressLine2,
    record.line1,
    record.line2,
    record.street,
    record.town,
    record.city,
    record.postTown,
    record.postcode,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return '';
};

const extractAddressOptions = (payload: unknown) => {
  const payloadRecord =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;

  const possibleLists: unknown[] = [
    payloadRecord?.data && typeof payloadRecord.data === 'object'
      ? (payloadRecord.data as Record<string, unknown>).addresses
      : undefined,
    payloadRecord?.data,
    payloadRecord?.addresses,
    payloadRecord?.results,
    payload,
  ];

  for (const list of possibleLists) {
    if (!Array.isArray(list)) {
      continue;
    }

    const normalized = list
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        if (item && typeof item === 'object') {
          return buildAddressFromObject(item as Record<string, unknown>);
        }

        return '';
      })
      .filter(Boolean);

    if (normalized.length > 0) {
      return Array.from(new Set(normalized));
    }
  }

  return [] as string[];
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const normalizeCustomers = (value: unknown): CustomerItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) return null;

      const rowId =
        typeof record._id === 'string'
          ? record._id
          : typeof record.id === 'string'
            ? record.id
            : `row-${index}`;

      return {
        ...(record as unknown as CustomerItem),
        _id: rowId,
      };
    })
    .filter((item): item is CustomerItem => item !== null);
};

const extractCustomers = (payload: unknown): CustomerItem[] => {
  const direct = normalizeCustomers(payload);
  if (direct.length > 0) return direct;

  const record = asRecord(payload);
  if (!record) return [];

  const dataRecord = asRecord(record.data);
  const candidates: unknown[] = [
    dataRecord?.data,
    dataRecord?.users,
    record.data,
    record.users,
    record.items,
    record.results,
  ];

  for (const candidate of candidates) {
    const list = normalizeCustomers(candidate);
    if (list.length > 0) return list;
  }

  return [];
};

const extractTotalItems = (payload: unknown, fallback: number) => {
  const record = asRecord(payload);
  if (!record) return fallback;

  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  const nestedMetaRecord = asRecord(dataRecord?.meta);

  const total =
    asNumber(nestedMetaRecord?.total) ??
    asNumber(metaRecord?.total) ??
    asNumber(dataRecord?.total) ??
    asNumber(record.total) ??
    fallback;

  return Math.max(0, Math.floor(total));
};

const getCustomerName = (customer: CustomerItem) => {
  if (typeof customer.fullName === 'string' && customer.fullName.trim()) {
    return customer.fullName.trim();
  }

  const firstName = typeof customer.firstName === 'string' ? customer.firstName.trim() : '';
  const lastName = typeof customer.lastName === 'string' ? customer.lastName.trim() : '';
  const combined = `${firstName} ${lastName}`.trim();

  return combined || 'N/A';
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const CustomerCreateForm = ({
  onBack,
  onSubmit,
  onCsvUpload,
  isSubmitting,
  isCsvUploading,
}: CustomerFormProps) => {
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    fullName: '',
    email: '',
    password: '',
    role: '',
    gender: '',
    phoneNumber: '',
    dateOfBirth: '',
    country: '',
    city: '',
    address: '',
    tag: '',
    verifiedForget: '',
    status: '',
    stripeAccountId: '',
  });
  const [postcode, setPostcode] = useState('');
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [postcodeMessage, setPostcodeMessage] = useState('');
  const [postcodeError, setPostcodeError] = useState('');
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    const normalizedPostcode = normalizePostcode(postcode);

    if (!normalizedPostcode) {
      setAddressOptions([]);
      setIsAddressDropdownOpen(false);
      setIsAddressLoading(false);
      setPostcodeMessage('');
      setPostcodeError('');
      setFormData((prev) => ({ ...prev, address: '' }));
      return;
    }

    setPostcodeError('');
    setPostcodeMessage('');
    setIsAddressLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(resolvePostcodeLookupEndpoint(normalizedPostcode), {
          signal: controller.signal,
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            result &&
            typeof result === 'object' &&
            'message' in result &&
            typeof (result as { message?: unknown }).message === 'string'
              ? ((result as { message: string }).message || 'Failed to fetch postcode addresses.')
              : 'Failed to fetch postcode addresses.';
          throw new Error(message);
        }

        const addresses = extractAddressOptions(result);
        setAddressOptions(addresses);

        if (addresses.length === 0) {
          setIsAddressDropdownOpen(false);
          setPostcodeMessage('No locations found for this postcode.');
          setFormData((prev) => ({ ...prev, address: '' }));
        } else {
          setIsAddressDropdownOpen(true);
          setPostcodeMessage(`${addresses.length} location(s) found. Please select one.`);
        }
      } catch (lookupError) {
        if (controller.signal.aborted) {
          return;
        }

        setAddressOptions([]);
        setIsAddressDropdownOpen(false);
        setPostcodeMessage('');
        setFormData((prev) => ({ ...prev, address: '' }));
        setPostcodeError(
          lookupError instanceof Error
            ? lookupError.message
            : 'Failed to fetch postcode addresses.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsAddressLoading(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [postcode]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePostcodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toUpperCase();
    setPostcode(value);
    setAddressOptions([]);
    setIsAddressDropdownOpen(false);
    setFormData((prev) => ({ ...prev, address: '' }));
    setPostcodeMessage('');
    setPostcodeError('');
  };

  const handleCsvDialogChange = (nextOpen: boolean) => {
    setIsCsvDialogOpen(nextOpen);
    if (!nextOpen) {
      setCsvFile(null);
    }
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCsvFile(file);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file.');
      return;
    }

    const uploaded = await onCsvUpload(csvFile);
    if (uploaded) {
      handleCsvDialogChange(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedTag = formData.tag.trim();

    if (!normalizedTag) {
      toast.error('Please select a customer tag before continuing.');
      return;
    }

    await onSubmit({
      ...formData,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      role: formData.role.trim(),
      gender: formData.gender.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      dateOfBirth: formData.dateOfBirth.trim(),
      country: formData.country.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      tag: normalizedTag,
      verifiedForget: formData.verifiedForget,
      status: formData.status.trim(),
      stripeAccountId: formData.stripeAccountId.trim(),
    });
  };

  return (
    <>
      <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[20px] font-semibold text-[#2D3D4D]">Add Customer</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCsvDialogChange(true)}
            disabled={isCsvUploading}
            className="rounded-[8px] border border-[#D5DCE3] px-4 py-2 text-sm font-medium text-[#2D3D4D] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCsvUploading ? 'Uploading CSV...' : 'Add CSV File'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-[8px] border border-[#D5DCE3] px-4 py-2 text-sm font-medium text-[#2D3D4D] hover:bg-[#F7FAFC]"
          >
            Back To List
          </button>
        </div>
      </div>

      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full space-y-4 md:space-y-5"
      >
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="block text-base md:text-[17px] font-medium text-[#2D3D4D]">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter full name"
              className="h-12 w-full rounded-none border-b border-[#2D3D4D] bg-[#FFFFFF] px-4 text-base text-[#2D3D4D] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="block text-base md:text-[17px] font-medium text-[#2D3D4D]">
              Email
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email"
              className="h-12 w-full rounded-none border-b border-[#2D3D4D] bg-[#FFFFFF] px-4 text-base text-[#2D3D4D] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

     



          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="block text-base md:text-[17px] font-medium text-[#2D3D4D]">
              Phone Number
            </label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              className="h-12 w-full rounded-none border-b border-[#2D3D4D] bg-[#FFFFFF] px-4 text-base text-[#2D3D4D] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="block text-base md:text-[17px] font-medium text-[#2D3D4D]">
              Customer Tag
            </label>
            <select
              name="tag"
              value={formData.tag}
              onChange={handleInputChange}
              className="h-12 w-full rounded-none border-b border-[#2D3D4D] bg-[#FFFFFF] px-4 text-base text-[#2D3D4D] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select customer tag</option>
              {CUSTOMER_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-6 space-y-1">
            <label className="block text-base md:text-[17px] font-medium text-[#2D3D4D]">
              Postcode
            </label>
            <input
              type="text"
              name="postcode"
              value={postcode}
              onChange={handlePostcodeChange}
              placeholder="e.g. SW1A 1AA"
              className="h-12 w-full rounded-none border-b border-[#2D3D4D] bg-[#FFFFFF] px-4 text-base text-[#2D3D4D] focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {isAddressLoading && (
              <p className="text-[13px] text-[#58616B]">Looking up locations...</p>
            )}
            {!!postcodeError && (
              <p className="text-[13px] text-red-500">{postcodeError}</p>
            )}
            {!postcodeError && !!postcodeMessage && (
              <p className="text-[13px] text-[#58616B]">{postcodeMessage}</p>
            )}

            {addressOptions.length > 0 && (
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddressDropdownOpen((prev) => !prev)}
                  className="flex h-12 w-full items-center justify-between border-b border-[#2D3D4D] bg-[#FFFFFF] px-4 text-left text-base text-[#2D3D4D] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className={cn(!formData.address && 'text-[#7D8A98]')}>
                    {formData.address || 'Select location from this postcode'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-[#2D3D4D] transition-transform',
                      isAddressDropdownOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isAddressDropdownOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#D5DCE3] bg-white shadow-lg">
                    {addressOptions.map((address) => (
                      <button
                        key={address}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, address }));
                          setIsAddressDropdownOpen(false);
                        }}
                        className={cn(
                          'block w-full px-4 py-3 text-left text-sm hover:bg-[#F0F4F8]',
                          formData.address === address
                            ? 'bg-[#F7FAFC] font-medium text-[#2D3D4D]'
                            : 'text-[#2D3D4D]',
                        )}
                      >
                        {address}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 md:pt-0">
          <button
            type="submit"
            disabled={isSubmitting || !formData.tag.trim()}
            className="h-12 w-full md:w-auto md:min-w-[180px] rounded-[8px] bg-[#FBFF26] px-8 text-base font-bold text-[#2D3D4D] transition-all hover:bg-[#FBFF26]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </form>
      </div>

      <Dialog open={isCsvDialogOpen} onOpenChange={handleCsvDialogChange}>
        <DialogContent className="max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#2D3D4D]">
              Upload Customer CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <label
              htmlFor="customer-csv-file"
              className="block text-sm font-medium text-[#2D3D4D]"
            >
              csvFile
            </label>
            <input
              id="customer-csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="block w-full cursor-pointer rounded-md border border-[#D5DCE3] bg-white px-3 py-2 text-sm text-[#2D3D4D] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[#F0F4F8] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#2D3D4D] hover:file:bg-[#E6ECF2]"
            />
            {csvFile && (
              <p className="text-xs text-[#5E6B78]">
                Selected: <span className="font-medium text-[#2D3D4D]">{csvFile.name}</span>
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleCsvDialogChange(false)}
              disabled={isCsvUploading}
              className="h-10 rounded-[8px] border border-[#D5DCE3] px-4 text-sm font-medium text-[#2D3D4D] hover:bg-[#F7FAFC] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCsvUpload()}
              disabled={!csvFile || isCsvUploading}
              className="h-10 rounded-[8px] bg-[#FBFF26] px-4 text-sm font-semibold text-[#2D3D4D] hover:bg-[#FBFF26]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCsvUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function CustomersPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(resolveUserListEndpoint(page, PAGE_SIZE), {
        method: 'GET',
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const result = (await response.json().catch(() => null)) as ApiResponse | null;
      const hasExplicitFailure = result?.success === false || result?.status === false;

      if (!response.ok || hasExplicitFailure) {
        throw new Error(result?.message || 'Failed to load customers.');
      }

      const rows = extractCustomers(result?.data ?? result);
      const total = extractTotalItems(result?.data ?? result, rows.length);

      setCustomers(rows);
      setTotalItems(total);
    } catch (loadError) {
      setCustomers([]);
      setTotalItems(0);
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load customers.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, token]);

  useEffect(() => {
    if (!isCreateMode) {
      void loadCustomers();
    }
  }, [isCreateMode, loadCustomers]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startItem = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalItems);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleCreateCustomer = async (payload: CreateCustomerPayload) => {
    setIsSubmittingCreate(true);
    setError('');

    try {
      const formData = new FormData();
      const entries = Object.entries(payload) as [keyof CreateCustomerPayload, string][];

      entries.forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(resolveUserCollectionEndpoint(), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const result = (await response.json().catch(() => null)) as ApiResponse | null;
      const hasExplicitFailure = result?.success === false || result?.status === false;

      if (!response.ok || hasExplicitFailure) {
        throw new Error(result?.message || 'Failed to create customer.');
      }

      toast.success(result?.message || 'Customer created successfully.');
      setIsCreateMode(false);
      setPage(1);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Failed to create customer.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleUploadCustomerCsv = async (file: File): Promise<boolean> => {
    setIsCsvUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch(resolveUserCollectionEndpoint(), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const result = (await response.json().catch(() => null)) as ApiResponse | null;
      const hasExplicitFailure = result?.success === false || result?.status === false;

      if (!response.ok || hasExplicitFailure) {
        throw new Error(result?.message || 'Failed to upload CSV file.');
      }

      toast.success(result?.message || 'CSV uploaded successfully.');
      setIsCreateMode(false);
      setPage(1);

      return true;
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : 'Failed to upload CSV file.';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsCsvUploading(false);
    }
  };

  const handleOpenDelete = (customer: CustomerItem) => {
    setDeleteTarget(customer);
    setIsDeleteOpen(true);
  };

  const handleDeleteOpenChange = (nextOpen: boolean) => {
    setIsDeleteOpen(nextOpen);
    if (!nextOpen) {
      setDeleteTarget(null);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;

    const id = deleteTarget._id;
    setDeletingId(id);
    setError('');

    try {
      const response = await fetch(resolveUserDeleteEndpoint(id), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const result = (await response.json().catch(() => null)) as ApiResponse | null;
      const hasExplicitFailure = result?.success === false || result?.status === false;

      if (!response.ok || hasExplicitFailure) {
        throw new Error(result?.message || 'Failed to delete customer.');
      }

      toast.success(result?.message || 'Customer deleted successfully.');
      setIsDeleteOpen(false);
      setDeleteTarget(null);

      const isLastItemOnPage = customers.length === 1;
      if (isLastItemOnPage && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        void loadCustomers();
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Failed to delete customer.';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const totalCustomerLabel = useMemo(
    () => `${totalItems} customer${totalItems === 1 ? '' : 's'}`,
    [totalItems]
  );

  const deleteLabel = deleteTarget ? getCustomerName(deleteTarget) : 'this customer';

  if (isCreateMode) {
    return (
      <div className="min-h-screen bg-[#EEF2F5] px-4 py-5 sm:px-6 lg:px-3">
        <div className="w-full">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-bold leading-none text-[#2D3D4D] sm:text-[32px]">
                Customer Management
              </h1>
              <div className="mt-2 flex items-center gap-2 text-[16px] font-medium text-[#2D3D4D]">
                <Link href="/" className="transition hover:text-[#00A56F]">
                  Dashboard
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                <span>Customer Management</span>
              </div>
            </div>
          </div>

          {!!error && (
            <div className="mb-3 rounded-md border border-[#E6BAC0] bg-[#FFF4F5] px-4 py-3 text-sm text-[#C0392B]">
              {error}
            </div>
          )}

          <CustomerCreateForm
            onBack={() => setIsCreateMode(false)}
            onSubmit={handleCreateCustomer}
            isSubmitting={isSubmittingCreate}
            onCsvUpload={handleUploadCustomerCsv}
            isCsvUploading={isCsvUploading}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#EEF2F5] px-4 py-5 sm:px-6 lg:px-3">
        <div className="w-full">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-bold leading-none text-[#2D3D4D] sm:text-[32px]">
                Customer Management
              </h1>

              <div className="mt-2 flex items-center gap-2 text-[16px] font-medium text-[#2D3D4D]">
                <Link href="/" className="transition hover:text-[#00A56F]">
                  Dashboard
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                <span>Customer Management</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateMode(true)}
              className="inline-flex h-[48px] items-center gap-2 rounded-[8px] bg-[#FBFF26] px-5 text-lg font-medium text-[#2D3D4D] hover:bg-[#FBFF26]/95"
            >
              <Plus className="h-5 w-5" />
              Add Customer
            </button>
          </div>

          <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#5E6B78]">
                {isLoading ? 'Loading customers...' : `Showing ${totalCustomerLabel}`}
              </p>
              <button
                type="button"
                onClick={() => void loadCustomers()}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[#D5DCE3] px-3 py-2 text-sm font-medium text-[#2D3D4D] hover:bg-[#F7FAFC]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

       

            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="border-none bg-[#F4F7F9] hover:bg-[#F4F7F9]">
                    <TableHead className="h-[42px] rounded-l-[8px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Name
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Email
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Phone
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Role
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Customer Type
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Location
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Status
                    </TableHead>
                    <TableHead className="h-[42px] px-4 text-[16px] font-medium text-[#00A56F]">
                      Created
                    </TableHead>
                    <TableHead className="h-[42px] rounded-r-[8px] px-4 text-right text-[16px] font-medium text-[#00A56F]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`} className="border-b border-[#EDF1F4]">
                        {Array.from({ length: 9 }).map((__, cellIndex) => (
                          <TableCell key={`cell-${cellIndex}`} className="px-4 py-[14px]">
                            <div className="h-5 w-full animate-pulse rounded-md bg-gray-200" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-[#64748B]">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => {
                      const location =
                        (typeof customer.address === 'string' && customer.address.trim()) ||
                        [customer.city, customer.country]
                          .filter((item): item is string => !!item && item.trim().length > 0)
                          .join(', ');

                      return (
                        <TableRow
                          key={customer._id}
                          className="border-b border-[#EDF1F4] hover:bg-transparent"
                        >
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            {getCustomerName(customer)}
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            {customer.email || 'N/A'}
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            {customer.phoneNumber || customer.phone || 'N/A'}
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            {customer.role || 'N/A'}
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            {customer.tag || customer.customerTag || 'N/A'}
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            <p className="max-w-[200px] truncate" title={location || 'N/A'}>
                              {location || 'N/A'}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium capitalize text-[#2D3D4D]">
                            {customer.status || 'N/A'}
                          </TableCell>
                          <TableCell className="px-4 py-[14px] text-[15px] font-medium text-[#2D3D4D]">
                            {formatDate(customer.createdAt)}
                          </TableCell>
                          <TableCell className="px-4 py-[14px]">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(customer)}
                                disabled={deletingId === customer._id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#F5D64E] transition hover:bg-[#FFF8DB] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="!h-5 !w-5 text-[#FFDE59]" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] font-medium text-[#64748B]">
                Showing {startItem} to {endItem} of {totalItems} results
              </p>

              <CustomPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="max-w-[420px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#2D3D4D]">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-[#5E6B78]">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-[#2D3D4D]">{deleteLabel}</span>?
          </p>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={!!deletingId}
              className="h-10 rounded-[8px] border border-[#D5DCE3] px-4 text-sm font-medium text-[#2D3D4D] hover:bg-[#F7FAFC] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteCustomer()}
              disabled={!!deletingId}
              className="h-10 rounded-[8px] bg-[#FBFF26] px-4 text-sm font-semibold text-[#2D3D4D] hover:bg-[#FBFF26]/90 disabled:opacity-60"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
