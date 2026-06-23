import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Megaphone, Pencil, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "../components/Badge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { request } from "../lib/api";
import { assetUrlMessage, isAssetUrl, normalizeAssetUrl } from "../lib/asset-url";
import { readError } from "../lib/format";
import type { Banner } from "../types";

const bannerSchema = z.object({
  title: z.string().min(3),
  image: z.string().trim().min(1).refine(isAssetUrl, {
    message: assetUrlMessage,
  }),
  link: z.string().optional(),
  sortOrder: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(0),
  ),
  isActive: z.boolean(),
});

type BannerFormInput = z.input<typeof bannerSchema>;
type BannerForm = z.output<typeof bannerSchema>;

const emptyBannerForm: BannerFormInput = {
  title: "",
  image: "",
  link: "",
  sortOrder: 0,
  isActive: true,
};

export function BannersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const bannersQuery = useQuery({
    queryKey: ["banners"],
    queryFn: ({ signal }) =>
      request<Banner[]>("/banners/admin/all", { token, signal }),
  });
  const form = useForm<BannerFormInput, unknown, BannerForm>({
    resolver: zodResolver(bannerSchema),
    defaultValues: emptyBannerForm,
  });
  const bannerImagePreview = useWatch({ control: form.control, name: "image" });
  const createBanner = useMutation({
    mutationFn: (values: BannerForm) =>
      request<Banner>("/banners", {
        token,
        method: "POST",
        body: JSON.stringify(bannerPayload(values)),
      }),
    onSuccess: async () => {
      setEditingBanner(null);
      form.reset(emptyBannerForm);
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner created");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const updateBanner = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BannerForm }) =>
      request<Banner>(`/banners/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify(bannerPayload(values)),
      }),
    onSuccess: async () => {
      setEditingBanner(null);
      form.reset(emptyBannerForm);
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner updated");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const deleteBanner = useMutation({
    mutationFn: (id: string) =>
      request(`/banners/${id}`, { token, method: "DELETE" }),
    onSuccess: async (_data, id) => {
      if (editingBanner?.id === id) {
        setEditingBanner(null);
        form.reset(emptyBannerForm);
      }
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
    onSuccess: async (_banner, variables) => {
      if (editingBanner?.id === variables.id) {
        form.setValue("isActive", variables.isActive);
      }
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner status updated");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (bannersQuery.isLoading) return <LoadingState />;
  if (bannersQuery.error)
    return <ErrorState message={readError(bannersQuery.error)} />;

  const banners = bannersQuery.data ?? [];
  const savingBanner = createBanner.isPending || updateBanner.isPending;

  const startEditingBanner = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset(bannerToForm(banner));
    document
      .getElementById("banner-form")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const cancelEditingBanner = () => {
    setEditingBanner(null);
    form.reset(emptyBannerForm);
  };

  return (
    <div className="split-layout">
      <Panel
        title="Home banners"
        eyebrow="visual merchandising"
        className="banner-list-panel"
      >
        <div className="banner-wall">
          {banners.length === 0 ? (
            <div className="empty-inline">
              No banners yet. Publish one to fill the home carousel.
            </div>
          ) : (
            banners.map((banner) => {
              const imageUrl = isAssetUrl(banner.image)
                ? normalizeAssetUrl(banner.image)
                : null;

              return (
                <article
                  className={`banner-card${banner.isActive ? "" : " banner-card-inactive"}`}
                  key={banner.id}
                >
                  <div className="banner-media">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={banner.title}
                        width="320"
                        height="180"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="banner-media-empty">
                        <ImageOff size={18} />
                        <span>Image unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="banner-card-body">
                    <div className="banner-card-heading">
                      <strong title={banner.title}>{banner.title}</strong>
                      <Badge tone={banner.isActive ? "good" : "neutral"}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="banner-meta">
                      <span title={banner.link ?? undefined}>
                        {banner.link || "No link"}
                      </span>
                      <span>Order {banner.sortOrder}</span>
                    </div>
                  </div>
                  <div className="banner-actions">
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Edit banner ${banner.title}`}
                      title="Edit"
                      onClick={() => startEditingBanner(banner)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={`icon-button banner-action${banner.isActive ? " icon-button-danger" : ""}`}
                      type="button"
                      aria-label={`${banner.isActive ? "Deactivate" : "Activate"} banner ${banner.title}`}
                      title={banner.isActive ? "Deactivate" : "Activate"}
                      disabled={deleteBanner.isPending || toggleBanner.isPending}
                      onClick={() => {
                        if (banner.isActive) {
                          if (
                            window.confirm(`Deactivate banner ${banner.title}?`)
                          ) {
                            deleteBanner.mutate(banner.id);
                          }
                        } else {
                          toggleBanner.mutate({ id: banner.id, isActive: true });
                        }
                      }}
                    >
                      {banner.isActive ? (
                        <Trash2 size={16} aria-hidden="true" />
                      ) : (
                        <Power size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Panel>
      <Panel
        title={editingBanner ? "Edit banner" : "Create banner"}
        eyebrow={editingBanner ? editingBanner.title : "campaign surface"}
      >
        <form
          id="banner-form"
          className="control-form"
          onSubmit={form.handleSubmit((values) =>
            editingBanner
              ? updateBanner.mutate({ id: editingBanner.id, values })
              : createBanner.mutate(values),
          )}
        >
          <label htmlFor="banner-title">
            Title
            <input
              id="banner-title"
              {...form.register("title")}
              placeholder="Title"
            />
            {form.formState.errors.title && (
              <span className="field-error">
                {form.formState.errors.title.message}
              </span>
            )}
          </label>
          <label htmlFor="banner-image">
            Image URL
            <input
              id="banner-image"
              {...form.register("image")}
              placeholder="Image URL"
            />
            {form.formState.errors.image && (
              <span className="field-error">
                {form.formState.errors.image.message}
              </span>
            )}
            <BannerAssetPreview value={bannerImagePreview} />
          </label>
          <label htmlFor="banner-link">
            Link
            <input
              id="banner-link"
              {...form.register("link")}
              placeholder="Link"
            />
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
          <label className="check-row" htmlFor="banner-isActive">
            <input
              id="banner-isActive"
              type="checkbox"
              {...form.register("isActive")}
            />
            <span>
              <strong>Active</strong>
              <small>Inactive banners are hidden from the home carousel.</small>
            </span>
          </label>
          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={savingBanner}
            >
              <Megaphone size={17} /> {editingBanner ? "Update" : "Publish"}
              banner
            </button>
            {editingBanner && (
              <button
                className="ghost-button"
                type="button"
                disabled={savingBanner}
                onClick={cancelEditingBanner}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </Panel>
    </div>
  );
}

function bannerPayload(values: BannerForm) {
  return {
    ...values,
    image: normalizeAssetUrl(values.image),
    link: values.link?.trim() ? values.link.trim() : null,
  };
}

function bannerToForm(banner: Banner): BannerFormInput {
  return {
    title: banner.title,
    image: banner.image,
    link: banner.link ?? "",
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
  };
}

function BannerAssetPreview({ value }: { value?: string }) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (!isAssetUrl(trimmed)) {
    return <span className="field-hint">Preview appears after a valid asset URL.</span>;
  }

  return (
    <div className="asset-preview banner-form-preview">
      <img src={normalizeAssetUrl(trimmed)} alt="Banner preview" loading="lazy" />
      <span>Banner preview</span>
    </div>
  );
}
