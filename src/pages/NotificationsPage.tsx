import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { notificationTypes } from "../lib/constants";
import { request } from "../lib/api";
import { readError, readFormError } from "../lib/format";
import type { NotificationType } from "../types";

const notificationSchema = z.object({
  type: z.enum(["PROMO", "ORDER", "SYSTEM"]),
  title: z.string().min(3).max(120),
  body: z.string().min(8).max(1000),
});

type NotificationFormInput = z.input<typeof notificationSchema>;
type NotificationForm = z.output<typeof notificationSchema>;

type NotificationsCopy = {
  sent: string;
  confirm: string;
  title: string;
  eyebrow: string;
  type: string;
  typeLabels: Record<NotificationType, string>;
  messageTitle: string;
  message: string;
  placeholderTitle: string;
  placeholderBody: string;
  sending: string;
  send: string;
  guidanceTitle: string;
  guidanceEyebrow: string;
  guidance: string;
};

const copy: Record<Language, NotificationsCopy> = {
  en: {
    sent: "Broadcast sent",
    confirm: "Send this broadcast to all customers?",
    title: "Broadcast message",
    eyebrow: "notifications",
    type: "Type",
    typeLabels: { PROMO: "Promo", ORDER: "Order", SYSTEM: "System" },
    messageTitle: "Title",
    message: "Message",
    placeholderTitle: "Flash Sale Started",
    placeholderBody: "Write the broadcast body...",
    sending: "Sending...",
    send: "Send broadcast",
    guidanceTitle: "Delivery guidance",
    guidanceEyebrow: "operator notes",
    guidance:
      "Broadcast creates a global in-app notification. User-specific order signals are created automatically by order status and payment changes from the API.",
  },
  id: {
    sent: "Broadcast terkirim",
    confirm: "Kirim broadcast ini ke semua pelanggan?",
    title: "Broadcast message",
    eyebrow: "notifikasi",
    type: "Tipe",
    typeLabels: { PROMO: "Promo", ORDER: "Order", SYSTEM: "System" },
    messageTitle: "Judul",
    message: "Pesan",
    placeholderTitle: "Flash Sale Dimulai",
    placeholderBody: "Tulis isi broadcast...",
    sending: "Mengirim...",
    send: "Kirim broadcast",
    guidanceTitle: "Catatan pengiriman",
    guidanceEyebrow: "operator notes",
    guidance:
      "Broadcast membuat notifikasi in-app global. Sinyal pesanan per pengguna dibuat otomatis oleh API saat status pesanan dan pembayaran berubah.",
  },
};

export function NotificationsPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
  const form = useForm<NotificationFormInput, unknown, NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { type: "SYSTEM", title: "", body: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: NotificationForm) =>
      request("/notifications/broadcast", {
        token,
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      form.reset({ type: "SYSTEM", title: "", body: "" });
      toast.success(c.sent);
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  return (
    <div className="split-layout">
      <Panel title={c.title} eyebrow={c.eyebrow}>
        <form
          className="control-form"
          onSubmit={form.handleSubmit((values) => {
            if (window.confirm(c.confirm)) {
              mutation.mutate(values);
            }
          })}
        >
          <label htmlFor="notification-type">
            {c.type}
            <select id="notification-type" {...form.register("type")}>
              {notificationTypes.map((type: NotificationType) => (
                <option key={type} value={type}>{c.typeLabels[type]}</option>
              ))}
            </select>
            {form.formState.errors.type && (
              <span className="field-error">
                {readFormError(form.formState.errors.type.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="notification-title">
            {c.messageTitle}
            <input
              id="notification-title"
              {...form.register("title")}
              placeholder={c.placeholderTitle}
            />
            {form.formState.errors.title && (
              <span className="field-error">
                {readFormError(form.formState.errors.title.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="notification-body">
            {c.message}
            <textarea
              id="notification-body"
              {...form.register("body")}
              placeholder={c.placeholderBody}
            />
            {form.formState.errors.body && (
              <span className="field-error">
                {readFormError(form.formState.errors.body.message, language)}
              </span>
            )}
          </label>
          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={mutation.isPending}
            >
              <Radio size={17} />
              {mutation.isPending ? c.sending : c.send}
            </button>
          </div>
        </form>
      </Panel>
      <Panel title={c.guidanceTitle} eyebrow={c.guidanceEyebrow}>
        <p className="copy-block">
          {c.guidance}
        </p>
      </Panel>
    </div>
  );
}
