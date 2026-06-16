import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

type BannerFormInput = z.input<typeof bannerSchema>;
type BannerForm = z.output<typeof bannerSchema>;

export function BannersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const bannersQuery = useQuery({
    queryKey: ["banners"],
    queryFn: () => request<Banner[]>("/banners", { token }),
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
      toast.success("Banner removed");
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
              <img src={banner.image} alt="" />
              <div>
                <strong>{banner.title}</strong>
                <span>
                  {banner.link || "No link"} · order {banner.sortOrder}
                </span>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove banner ${banner.title}?`)) {
                    deleteBanner.mutate(banner.id);
                  }
                }}
              >
                <Trash2 size={16} /> Remove
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
          <input {...form.register("title")} placeholder="Title" />
          <input {...form.register("image")} placeholder="Image URL" />
          <input {...form.register("link")} placeholder="Link" />
          <input
            {...form.register("sortOrder")}
            type="number"
            placeholder="Sort order"
          />
          <button className="primary-button" disabled={createBanner.isPending}>
            <Megaphone size={17} /> Publish banner
          </button>
        </form>
      </Panel>
    </div>
  );
}
