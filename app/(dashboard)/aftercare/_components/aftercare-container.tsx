'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AftercareData = {
  _id: string;
  title: string;
  subTitle: string;
};

type ApiEnvelope<T> = {
  statusCode?: number;
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T | null;
};

const AFTERCARE_ID = '6a0e8e3c7b2430d68732b8d7';

const getApiBase = () => (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

const hasExplicitFailure = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return false;
  const parsed = payload as ApiEnvelope<unknown>;
  return parsed.success === false || parsed.status === false;
};

const getApiMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return null;
  const parsed = payload as ApiEnvelope<unknown>;
  return typeof parsed.message === 'string' && parsed.message.trim()
    ? parsed.message
    : null;
};

export default function AfterCareContainer() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Omit<AftercareData, '_id'>>({
    title: '',
    subTitle: '',
  });

  const apiBase = useMemo(getApiBase, []);
  const aftercareEndpoint = useMemo(
    () => (apiBase ? `${apiBase}/aftercare/${AFTERCARE_ID}` : `/aftercare/${AFTERCARE_ID}`),
    [apiBase]
  );

  const aftercareQuery = useQuery({
    queryKey: ['aftercare-data', token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await fetch(aftercareEndpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || hasExplicitFailure(payload)) {
        throw new Error(getApiMessage(payload) ?? 'Failed to load aftercare data.');
      }

      return payload.data as AftercareData;
    },
  });

  useEffect(() => {
    if (aftercareQuery.data) {
      setFormData({
        title: aftercareQuery.data.title || '',
        subTitle: aftercareQuery.data.subTitle || '',
      });
    }
  }, [aftercareQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Omit<AftercareData, '_id'>) => {
      const response = await fetch(aftercareEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || hasExplicitFailure(result)) {
        throw new Error(getApiMessage(result) ?? 'Failed to update aftercare data.');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Aftercare data updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['aftercare-data', token] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save aftercare data.');
    },
  });

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.title || !formData.subTitle) {
      toast.error('Please fill in both the title and subtitle.');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (status === 'unauthenticated') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        Please sign in first to manage Aftercare content.
      </div>
    );
  }

  if (status === 'loading' || aftercareQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (aftercareQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        {aftercareQuery.error instanceof Error ? aftercareQuery.error.message : 'Failed to load data.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="w-full">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[#0F172A]">Aftercare Information</h2>
            <p className="text-sm text-[#64748B] mt-1">Manage the aftercare support information displayed on the website.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="h-11"
                  placeholder="Aftercare"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subTitle">Subtitle</Label>
                <Input
                  id="subTitle"
                  name="subTitle"
                  value={formData.subTitle}
                  onChange={handleChange}
                  className="h-11"
                  placeholder="Have an issue or need some support?"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-11 bg-[#FBFF26] px-8 font-semibold text-[#2D3D4D] hover:bg-[#FBFF26]/95 transition-colors"
              >
                {saveMutation.isPending ? 'Saving...' : 'Update Aftercare Information'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}