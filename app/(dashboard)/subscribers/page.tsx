"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {  CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  SendHorizonal,
  Loader2,
  Mail,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

type ApiResponse = {
  success?: boolean;
  status?: boolean;
  message?: string;
};

const CUSTOMER_TYPE_OPTIONS = [
  "Boiler Customer",
  "Bathroom Lead",
  "Heat Pump Quote",
  "Annual Service Reminder",
] as const;

const hasExplicitFailure = (payload: ApiResponse | null) =>
  payload?.success === false || payload?.status === false;

const getSubscriberEndpoint = () => {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
    /\/+$/,
    ""
  );

  return apiBase
    ? `${apiBase}/subscriber/send-message`
    : "/subscriber/send-message";
};

export default function SubscriberMessageForm() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      const trimmedTag = tag.trim();

      if (!trimmedSubject || !trimmedMessage) {
        throw new Error("Subject and message are required.");
      }

      const formData = new FormData();
      formData.append("subject", trimmedSubject);
      formData.append("message", trimmedMessage);

      if (trimmedTag) {
        formData.append("tag", trimmedTag);
      }

      if (attachment) {
        formData.append("attachment", attachment);
      }

      const res = await fetch(getSubscriberEndpoint(), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || hasExplicitFailure(data)) {
        throw new Error(data?.message || "Failed to send subscriber message.");
      }

      return data;
    },

    onSuccess: (data) => {
      toast.success(data?.message || "Message sent successfully.");
      setSubject("");
      setMessage("");
      setTag("");
      setAttachment(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },

    onError: (error: unknown) => {
      const messageText =
        error instanceof Error ? error.message : "Failed to send message.";
      toast.error(messageText);
    },
  });

  const isSubmitDisabled =
    sendMessageMutation.isPending ||
    !subject.trim() ||
    !message.trim() ||
    !token;

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
        

          <h1 className="mt-3 text-[28px] font-bold leading-none text-[#2D3D4D]">
            Send Newsletter Message
          </h1>

            <div className="mt-2 flex items-center gap-2 text-[16px] font-medium text-[#2D3D4D]">
                <Link href="/" className="transition hover:text-[#00A56F]">
                  Dashboard
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                <span>FAQ Management</span>
              </div>
        </div>

      </div>


      <div className="border border-[#E5E7EB] bg-white py-0 rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
       

        <CardContent className="px-4 py-6 sm:px-6">
          <form
            id="subscriber-message-form"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessageMutation.mutate();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="subscriber-subject" className="text-[#2D3D4D]">
                Subject
              </Label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  id="subscriber-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter your email subject"
                  required
                  className="h-11 rounded-[8px] border-[#D9E0E7] bg-white pl-10 text-[#2D3D4D] placeholder:text-[#94A3B8] focus-visible:border-[#D9E0E7] focus-visible:ring-[#FBFF26]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriber-message" className="text-[#2D3D4D]">
                Message
              </Label>

              <Textarea
                id="subscriber-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your newsletter message here"
                required
                rows={8}
                className="resize-none rounded-[8px] border-[#D9E0E7] bg-white text-[#2D3D4D] placeholder:text-[#94A3B8] focus-visible:border-[#D9E0E7] focus-visible:ring-[#FBFF26]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriber-customer-type" className="text-[#2D3D4D]">
                Customer Type
              </Label>

              <select
                id="subscriber-customer-type"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#D9E0E7] bg-white px-3 text-[14px] text-[#2D3D4D] focus:border-[#D9E0E7] focus:outline-none focus:ring-2 focus:ring-[#FBFF26]"
              >
                <option value="">All Customer</option>
                {CUSTOMER_TYPE_OPTIONS.map((customerType) => (
                  <option key={customerType} value={customerType}>
                    {customerType}
                  </option>
                ))}
              </select>

              <p className="text-[12px] text-[#64748B]">
                Optional. Keep &quot;All Customer&quot; to send everyone.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriber-attachment" className="text-[#2D3D4D]">
                Attachment (optional)
              </Label>

              <label
                htmlFor="subscriber-attachment"
                className="flex cursor-pointer items-center justify-between rounded-[10px] border border-dashed border-[#D9E0E7] bg-[#F8FAFC] px-4 py-3 transition hover:border-[#CBD5E1] hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-[8px] bg-[#FBFF26]/50 p-2 text-[#2D3D4D]">
                    <Upload className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-[#2D3D4D]">
                      Upload attachment
                    </p>
                    <p className="text-[12px] text-[#64748B]">
                      PNG, JPG, PDF, DOCX, ZIP and more
                    </p>
                  </div>
                </div>

                <span className="max-w-[180px] truncate text-[12px] font-medium text-[#2D3D4D]">
                  {attachment?.name || "Choose file"}
                </span>
              </label>

              <input
                ref={fileInputRef}
                id="subscriber-attachment"
                type="file"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubject("");
                  setMessage("");
                  setTag("");
                  setAttachment(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                disabled={sendMessageMutation.isPending}
                className="h-[42px] rounded-[8px] border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
              >
                Clear
              </Button>

              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="h-[42px] rounded-[8px] bg-[#FBFF26] px-6 font-semibold text-[#2D3D4D] hover:bg-[#FBFF26]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
