import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "../components/Badge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { request } from "../lib/api";
import { readError } from "../lib/format";
import type { Banner } from "../types";

const bannerSchema = z.object({
  title: z.string().min(3),
  image: z.string().url(),
  link: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
});

function isSafeImageUrl(url: string) {
  // Relative paths are same-origin and safe; remote images must be HTTPS so a
  // banner URL can't pull in mixed-content or insecure assets.
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

type BannerFormInput = z.input<typeof bannerSchema>;
type BannerForm = z.output<typeof bannerSchema>;

export function BannersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const bannersQuery = useQuery({
    queryKey: ["banners"],
    queryFn: ({ signal }) => request<Banner[]>("/banners/admin/all", { token, signal }),
  });
  const form = useForm<BannerFormInput, unknown, BannerForm>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { title: "", image: "", link: "", sortOrder: 0 },
  });
  const createBanner = useMutation({
    mutationFn: (values: BannerForm) =>
      request<Banner>("/banners", {
        token,
        method: "POST",
        body: JSON.stringify({ ...values, link: values.link || undefined }),
      }),
    onSuccess: async () => {
      form.reset({ title: "", image: "", link: "", sortOrder: 0 });
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner created");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const deleteBanner = useMutation({
    mutationFn: (id: string) =>
      request(`/banners/${id}`, { token, method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner deactivated");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const toggleBanner = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      request<Banner>(`/banners/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner status updated");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (bannersQuery.isLoading) return <LoadingState />;
  if (bannersQuery.error)
    return <ErrorState message={readError(bannersQuery.error)} />;

  return (
    <div className="split-layout">
      <Panel title="Home banners" eyebrow="visual merchandising">
        <div className="banner-wall">
          {(bannersQuery.data ?? []).map((banner) => (
            <article className="banner-card" key={banner.id}>
              {isSafeImageUrl(banner.image) && <img src={banner.image} alt="" />}
              <div>
                <strong>{banner.title}</strong>
                <span>
                  {banner.link || "No link"} · order {banner.sortOrder}
                </span>
                <Badge tone={banner.isActive ? "good" : "neutral"}>
                  {banner.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <button
                className="ghost-button"
                type="button"
                disabled={deleteBanner.isPending || toggleBanner.isPending}
                onClick={() => {
                  if (banner.isActive) {
                    if (window.confirm(`Deactivate banner ${banner.title}?`)) {
                      deleteBanner.mutate(banner.id);
                    }
                  } else {
                    toggleBanner.mutate({ id: banner.id, isActive: true });
                  }
                }}
              >
                <Trash2 size={16} /> {banner.isActive ? "Deactivate" : "Activate"}
              </button>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Create banner" eyebrow="campaign surface">
        <form
          className="control-form"
          onSubmit={form.handleSubmit((values) => createBanner.mutate(values))}
        >
          <label htmlFor="banner-title">
            Title
            <input id="banner-title" {...form.register("title")} placeholder="Title" />
            {form.formState.errors.title && (
              <span className="field-error">
                {form.formState.errors.title.message}
              </span>
            )}
          </label>
          <label htmlFor="banner-image">
            Image URL
            <input id="banner-image" {...form.register("image")} placeholder="Image URL" />
            {form.formState.errors.image && (
              <span className="field-error">
                {form.formState.errors.image.message}
              </span>
            )}
          </label>
          <label htmlFor="banner-link">
            Link
            <input id="banner-link" {...form.register("link")} placeholder="Link" />
            {form.formState.errors.link && (
              <span className="field-error">
                {form.formState.errors.link.message}
              </span>
            )}
          </label>
          <label htmlFor="banner-sortOrder">
            Sort order
            <input
              id="banner-sortOrder"
              {...form.register("sortOrder")}
              type="number"
              placeholder="Sort order"
            />
            {form.formState.errors.sortOrder && (
              <span className="field-error">
                {form.formState.errors.sortOrder.message}
              </span>
            )}
          </label>
          <button className="primary-button" disabled={createBanner.isPending}>
            <Megaphone size={17} /> Publish banner
          </button>
        </form>
      </Panel>
    </div>
  );
}