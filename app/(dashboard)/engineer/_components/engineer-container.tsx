'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type DateTimeItem = {
  date: string;
  time: string;
};

type EngineerData = {
  _id: string;
  title: string;
  subTitle: string;
  dateTime: DateTimeItem[];
  phonenumber: string;
  description: string;
};

type ApiEnvelope<T> = {
  statusCode?: number;
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T | null;
};

const ENGINEER_ID = '6a0e9f0fb4106e5c5e10f456';

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

export default function EngineerContainer() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Omit<EngineerData, '_id'>>({
    title: '',
    subTitle: '',
    dateTime: [],
    phonenumber: '',
    description: '',
  });

  const apiBase = useMemo(getApiBase, []);
  const engineerEndpoint = useMemo(
    () => (apiBase ? `${apiBase}/engineer/${ENGINEER_ID}` : `/engineer/${ENGINEER_ID}`),
    [apiBase]
  );

  const engineerQuery = useQuery({
    queryKey: ['engineer-data', token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await fetch(engineerEndpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || hasExplicitFailure(payload)) {
        throw new Error(getApiMessage(payload) ?? 'Failed to load engineer data.');
      }

      return payload.data as EngineerData;
    },
  });

  useEffect(() => {
    if (engineerQuery.data) {
      setFormData({
        title: engineerQuery.data.title || '',
        subTitle: engineerQuery.data.subTitle || '',
        dateTime: engineerQuery.data.dateTime || [],
        phonenumber: engineerQuery.data.phonenumber || '',
        description: engineerQuery.data.description || '',
      });
    }
  }, [engineerQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Omit<EngineerData, '_id'>) => {
      const response = await fetch(engineerEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || hasExplicitFailure(result)) {
        throw new Error(getApiMessage(result) ?? 'Failed to update engineer data.');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Engineer data updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['engineer-data', token] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save engineer data.');
    },
  });

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateTimeChange = (index: number, field: keyof DateTimeItem, value: string) => {
    setFormData((prev) => {
      const newDateTime = [...prev.dateTime];
      newDateTime[index] = { ...newDateTime[index], [field]: value };
      return { ...prev, dateTime: newDateTime };
    });
  };

  const addDateTime = () => {
    setFormData((prev) => ({
      ...prev,
      dateTime: [...prev.dateTime, { date: '', time: '' }],
    }));
  };

  const removeDateTime = (index: number) => {
    setFormData((prev) => {
      const newDateTime = [...prev.dateTime];
      newDateTime.splice(index, 1);
      return { ...prev, dateTime: newDateTime };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.title || !formData.phonenumber) {
      toast.error('Please fill in at least the title and phone number.');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (status === 'unauthenticated') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        Please sign in first to manage Engineer content.
      </div>
    );
  }

  if (status === 'loading' || engineerQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (engineerQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        {engineerQuery.error instanceof Error ? engineerQuery.error.message : 'Failed to load data.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="w-full">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[#0F172A]">Engineer Information</h2>
            <p className="text-sm text-[#64748B] mt-1">Manage the engineer contact and schedule information displayed on the website.</p>
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
                  placeholder="Engineer Title"
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
                  placeholder="Engineer SubTitle"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phonenumber">Phone Number</Label>
                <Input
                  id="phonenumber"
                  name="phonenumber"
                  value={formData.phonenumber}
                  onChange={handleChange}
                  className="h-11"
                  placeholder="01700000000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="min-h-24"
                  placeholder="Description here..."
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium text-[#0F172A]">Business Hours</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addDateTime}
                  className="h-9 px-3 text-sm border-[#94A3B8] text-[#334155]"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Schedule
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.dateTime.map((dt, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="flex-1 space-y-2">
                      <Label>Days (e.g., Mon-Fri)</Label>
                      <Input
                        value={dt.date}
                        onChange={(e) => handleDateTimeChange(index, 'date', e.target.value)}
                        className="h-10 bg-white"
                        placeholder="Mon-Fri"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Time (e.g., 8am - 6pm)</Label>
                      <Input
                        value={dt.time}
                        onChange={(e) => handleDateTimeChange(index, 'time', e.target.value)}
                        className="h-10 bg-white"
                        placeholder="8am - 6pm"
                      />
                    </div>
                    <div className="pt-8">
                      <Button
                        type="button"
                        onClick={() => removeDateTime(index)}
                        className="h-10 w-10 p-0 bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {formData.dateTime.length === 0 && (
                  <div className="text-sm text-gray-500 italic py-4 text-center border rounded-xl bg-gray-50 border-dashed">
                    No schedule entries added. Click &lsquo;Add Schedule&lsquo; to create one.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-11 bg-[#FBFF26] px-8 font-semibold text-[#2D3D4D] hover:bg-[#FBFF26]/95 transition-colors"
              >
                {saveMutation.isPending ? 'Saving...' : 'Update Engineer Information'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}