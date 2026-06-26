import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ImageOff,
  Megaphone,
  Pencil,
  Power,
  PowerOff,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ActionSheet } from "../components/ActionSheet";
import { ErrorState } from "../components/ErrorState";
import { ImageUploadButton } from "../components/ImageUploadButton";
import { LoadingState } from "../components/LoadingState";
import { NumberInput } from "../components/NumberInput";
import { Panel } from "../components/Panel";
import { SelectMenu } from "../components/SelectMenu";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { request } from "../lib/api";
import { assetUrlMessage, isAssetUrl, normalizeAssetUrl } from "../lib/asset-url";
import { parseWholeNumberInput, readError, readFormError } from "../lib/format";
import type { Banner } from "../types";

const bannerSchema = z.object({
  title: z.string().min(3),
  image: z.string().trim().min(1).refine(isAssetUrl, {
    message: assetUrlMessage,
  }),
  link: z.string().optional(),
  sortOrder: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = parseWholeNumberInput(value);
      return normalized === "" ? undefined : normalized;
    },
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

type BannerCopy = {
  created: string;
  updated: string;
  deactivated: string;
  deleted: string;
  statusUpdated: string;
  listTitle: string;
  listEyebrow: string;
  empty: string;
  noMatches: string;
  filtersLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  bannersCount: (count: number) => string;
  status: string;
  allStatuses: string;
  reset: string;
  imageUnavailable: string;
  active: string;
  inactive: string;
  noLink: string;
  order: string;
  edit: string;
  editBanner: (title: string) => string;
  deactivate: string;
  reactivate: string;
  deactivateBanner: (title: string) => string;
  reactivateBanner: (title: string) => string;
  deletePermanent: string;
  deletePermanentBanner: (title: string) => string;
  confirmDeletePermanent: (title: string) => string;
  formTitleCreate: string;
  formTitleEdit: string;
  formEyebrow: string;
  title: string;
  imageUrl: string;
  link: string;
  sortOrder: string;
  activeHelp: string;
  publish: string;
  publishDialog: string;
  update: string;
  cancel: string;
  previewHint: string;
  preview: string;
};

const copy: Record<Language, BannerCopy> = {
  en: {
    created: "Banner created",
    updated: "Banner updated",
    deactivated: "Banner deactivated",
    deleted: "Banner permanently deleted",
    statusUpdated: "Banner status updated",
    listTitle: "Home banners",
    listEyebrow: "visual merchandising",
    empty: "No banners yet. Publish one to fill the home carousel.",
    noMatches: "No banners match these filters.",
    filtersLabel: "Banner filters",
    searchLabel: "Search banners",
    searchPlaceholder: "Search title or link",
    bannersCount: (count) => `${count} ${count === 1 ? "banner" : "banners"}`,
    status: "Status",
    allStatuses: "All statuses",
    reset: "Reset",
    imageUnavailable: "Image unavailable",
    active: "Active",
    inactive: "Inactive",
    noLink: "No link",
    order: "Order",
    edit: "Edit",
    editBanner: (title: string) => `Edit banner ${title}`,
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    deactivateBanner: (title: string) => `Deactivate banner ${title}`,
    reactivateBanner: (title: string) => `Reactivate banner ${title}`,
    deletePermanent: "Delete permanently",
    deletePermanentBanner: (title: string) => `Delete banner ${title} permanently`,
    confirmDeletePermanent: (title: string) =>
      `Permanently delete banner "${title}"? This cannot be undone.`,
    formTitleCreate: "Create banner",
    formTitleEdit: "Edit banner",
    formEyebrow: "campaign surface",
    title: "Title",
    imageUrl: "Image URL",
    link: "Link",
    sortOrder: "Sort order",
    activeHelp: "Inactive banners are hidden from the home carousel.",
    publish: "Publish banner",
    publishDialog: "Publish",
    update: "Update banner",
    cancel: "Cancel",
    previewHint: "Preview appears after a valid asset URL.",
    preview: "Banner preview",
  },
  id: {
    created: "Banner dibuat",
    updated: "Banner diperbarui",
    deactivated: "Banner dinonaktifkan",
    deleted: "Banner dihapus permanen",
    statusUpdated: "Status banner diperbarui",
    listTitle: "Home Banner",
    listEyebrow: "visual merchandising",
    empty: "Belum ada banner. Publish satu banner untuk mengisi carousel home.",
    noMatches: "Tidak ada banner yang cocok dengan filter ini.",
    filtersLabel: "Filter banner",
    searchLabel: "Cari banner",
    searchPlaceholder: "Cari judul atau link",
    bannersCount: (count) => `${count} banner`,
    status: "Status",
    allStatuses: "Semua status",
    reset: "Reset",
    imageUnavailable: "Gambar tidak tersedia",
    active: "Active",
    inactive: "Inactive",
    noLink: "Tanpa link",
    order: "Urutan",
    edit: "Edit",
    editBanner: (title: string) => `Edit banner ${title}`,
    deactivate: "Nonaktifkan",
    reactivate: "Aktifkan",
    deactivateBanner: (title: string) => `Nonaktifkan banner ${title}`,
    reactivateBanner: (title: string) => `Aktifkan banner ${title}`,
    deletePermanent: "Hapus permanen",
    deletePermanentBanner: (title: string) => `Hapus permanen banner ${title}`,
    confirmDeletePermanent: (title: string) =>
      `Hapus permanen banner "${title}"? Aksi ini tidak bisa dibatalkan.`,
    formTitleCreate: "Buat banner",
    formTitleEdit: "Edit banner",
    formEyebrow: "area campaign",
    title: "Judul",
    imageUrl: "URL gambar",
    link: "Link",
    sortOrder: "Urutan tampil",
    activeHelp: "Banner nonaktif disembunyikan dari carousel home.",
    publish: "Publish banner",
    publishDialog: "Publish",
    update: "Perbarui banner",
    cancel: "Batal",
    previewHint: "Preview muncul setelah URL aset valid.",
    preview: "Preview banner",
  },
};

export function BannersPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
  const queryClient = useQueryClient();
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const [bannerSheetOpen, setBannerSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
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
      setBannerSheetOpen(false);
      setEditingBanner(null);
      form.reset(emptyBannerForm);
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(c.created);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const updateBanner = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BannerForm }) =>
      request<Banner>(`/banners/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify(bannerPayload(values)),
      }),
    onSuccess: async () => {
      setBannerSheetOpen(false);
      setEditingBanner(null);
      form.reset(emptyBannerForm);
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(c.updated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const toggleBanner = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive
        ? request<unknown>(`/banners/${id}`, {
            token,
            method: "PATCH",
            body: JSON.stringify({ isActive: true }),
          })
        : request<unknown>(`/banners/${id}`, {
            token,
            method: "DELETE",
          }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(variables.isActive ? c.statusUpdated : c.deactivated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const permanentDeleteBanner = useMutation({
    mutationFn: (id: string) =>
      request(`/banners/${id}/permanent`, { token, method: "DELETE" }),
    onSuccess: async (_data, id) => {
      setDeletingBanner(null);
      if (editingBanner?.id === id) {
        setBannerSheetOpen(false);
        setEditingBanner(null);
        form.reset(emptyBannerForm);
      }
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(c.deleted);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  if (bannersQuery.isLoading) return <LoadingState />;
  if (bannersQuery.error)
    return <ErrorState message={readError(bannersQuery.error, language)} />;

  const banners = bannersQuery.data ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredBanners = banners.filter((banner) => {
    const matchesSearch = normalizedSearch
      ? `${banner.title} ${banner.link ?? ""}`.toLowerCase().includes(normalizedSearch)
      : true;
    const matchesStatus =
      !statusFilter || (statusFilter === "active" ? banner.isActive : !banner.isActive);
    return matchesSearch && matchesStatus;
  });
  const savingBanner = createBanner.isPending || updateBanner.isPending;

  const startCreatingBanner = () => {
    setEditingBanner(null);
    form.reset(emptyBannerForm);
    setBannerSheetOpen(true);
  };

  const startEditingBanner = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset(bannerToForm(banner));
    setBannerSheetOpen(true);
  };

  const cancelEditingBanner = () => {
    setBannerSheetOpen(false);
    setEditingBanner(null);
    form.reset(emptyBannerForm);
  };

  return (
    <div className="split-layout banners-layout">
      <Panel
        title={c.listTitle}
        eyebrow={c.listEyebrow}
        headerMeta={c.bannersCount(filteredBanners.length)}
        className="banner-list-panel"
      >
        <div className="list-filter-bar banner-filter-bar" aria-label={c.filtersLabel}>
          <label htmlFor="banner-search">
            {c.searchLabel}
            <span className="filter-input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input
                id="banner-search"
                name="search"
                type="search"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={c.searchPlaceholder}
              />
            </span>
          </label>
          <label htmlFor="banner-status-filter">
            {c.status}
            <SelectMenu
              id="banner-status-filter"
              value={statusFilter}
              options={[
                { value: "", label: c.allStatuses },
                { value: "active", label: c.active },
                { value: "inactive", label: c.inactive },
              ]}
              onChange={(value) =>
                setStatusFilter(value as "" | "active" | "inactive")
              }
            />
          </label>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
          >
            {c.reset}
          </button>
        </div>
        <div className="banner-wall">
          {banners.length === 0 ? (
            <div className="empty-inline">
              {c.empty}
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="empty-inline">
              {c.noMatches}
            </div>
          ) : (
            filteredBanners.map((banner) => {
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
                        <span>{c.imageUnavailable}</span>
                      </div>
                    )}
                    <div className="banner-card-overlay">
                      <span
                        className={`badge ${banner.isActive ? "badge-good" : "badge-danger"}`}
                      >
                        {banner.isActive ? c.active : c.inactive}
                      </span>
                      <div className="banner-card-overlay-actions">
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={c.editBanner(banner.title)}
                          title={c.edit}
                          onClick={() => startEditingBanner(banner)}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          className={`icon-button${banner.isActive ? " icon-button-destructive-glyph" : ""}`}
                          type="button"
                          aria-label={
                            banner.isActive
                              ? c.deactivateBanner(banner.title)
                              : c.reactivateBanner(banner.title)
                          }
                          title={banner.isActive ? c.deactivate : c.reactivate}
                          disabled={toggleBanner.isPending}
                          onClick={() =>
                            toggleBanner.mutate({ id: banner.id, isActive: !banner.isActive })
                          }
                        >
                          {banner.isActive ? (
                            <PowerOff size={16} aria-hidden="true" />
                          ) : (
                            <Power size={16} aria-hidden="true" />
                          )}
                        </button>
                        <button
                          className="icon-button icon-button-danger"
                          type="button"
                          aria-label={c.deletePermanentBanner(banner.title)}
                          title={c.deletePermanent}
                          disabled={permanentDeleteBanner.isPending}
                          onClick={() => setDeletingBanner(banner)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="banner-card-body">
                    <div className="banner-card-heading">
                      <strong title={banner.title}>{banner.title}</strong>
                    </div>
                    <div className="banner-meta">
                      <span>{c.order} {banner.sortOrder}</span>
                      <span title={banner.link ?? undefined}>
                        {banner.link || c.noLink}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Panel>
      <div className="panel-external-actions">
        <button
          className="primary-button"
          type="button"
          onClick={startCreatingBanner}
        >
          <Megaphone size={17} aria-hidden="true" />
          {c.publish}
        </button>
      </div>
      <ActionSheet
        open={bannerSheetOpen}
        title={editingBanner ? c.formTitleEdit : c.formTitleCreate}
        eyebrow={editingBanner ? editingBanner.title : c.formEyebrow}
        closeLabel={c.cancel}
        onClose={() => {
          if (!savingBanner) cancelEditingBanner();
        }}
      >
        <form
          id="banner-form"
          className="control-form action-sheet-form"
          onSubmit={form.handleSubmit((values) =>
            editingBanner
              ? updateBanner.mutate({ id: editingBanner.id, values })
              : createBanner.mutate(values),
          )}
        >
          <label htmlFor="banner-title">
            {c.title}
            <input
              id="banner-title"
              {...form.register("title")}
              placeholder={c.title}
            />
            {form.formState.errors.title && (
              <span className="field-error">
                {readFormError(form.formState.errors.title.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="banner-image">
            {c.imageUrl}
            <input
              id="banner-image"
              {...form.register("image")}
              placeholder={c.imageUrl}
            />
            <ImageUploadButton
              disabled={savingBanner}
              onUploaded={(url) =>
                form.setValue("image", url, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {form.formState.errors.image && (
              <span className="field-error">
                {readFormError(form.formState.errors.image.message, language)}
              </span>
            )}
            <BannerAssetPreview
              value={bannerImagePreview}
              hint={c.previewHint}
              label={c.preview}
            />
          </label>
          <label htmlFor="banner-link">
            {c.link}
            <input
              id="banner-link"
              {...form.register("link")}
              placeholder={c.link}
            />
            {form.formState.errors.link && (
              <span className="field-error">
                {readFormError(form.formState.errors.link.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="banner-sortOrder">
            {c.sortOrder}
            <Controller
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <NumberInput
                  id="banner-sortOrder"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.sortOrder}
                />
              )}
            />
            {form.formState.errors.sortOrder && (
              <span className="field-error">
                {readFormError(form.formState.errors.sortOrder.message, language)}
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
              <strong>{c.active}</strong>
              <small>{c.activeHelp}</small>
            </span>
          </label>
          <div className="form-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={savingBanner}
              onClick={cancelEditingBanner}
            >
              {c.cancel}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={savingBanner}
            >
              <Megaphone size={17} />
              {editingBanner ? c.update : c.publishDialog}
            </button>
          </div>
        </form>
      </ActionSheet>
      <ActionSheet
        open={Boolean(deletingBanner)}
        title={c.deletePermanent}
        eyebrow={deletingBanner?.title}
        closeLabel={c.cancel}
        onClose={() => {
          if (!permanentDeleteBanner.isPending) setDeletingBanner(null);
        }}
      >
        <div className="control-form action-sheet-form">
          <p className="copy-block">
            {deletingBanner ? c.confirmDeletePermanent(deletingBanner.title) : ""}
          </p>
          <div className="form-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={permanentDeleteBanner.isPending}
              onClick={() => setDeletingBanner(null)}
            >
              {c.cancel}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={!deletingBanner || permanentDeleteBanner.isPending}
              onClick={() => {
                if (deletingBanner) permanentDeleteBanner.mutate(deletingBanner.id);
              }}
            >
              <Trash2 size={17} aria-hidden="true" />
              {c.deletePermanent}
            </button>
          </div>
        </div>
      </ActionSheet>
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

function BannerAssetPreview({
  value,
  hint,
  label,
}: {
  value?: string;
  hint: string;
  label: string;
}) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (!isAssetUrl(trimmed)) {
    return <span className="field-hint">{hint}</span>;
  }

  return (
    <div className="asset-preview banner-form-preview">
      <img src={normalizeAssetUrl(trimmed)} alt={label} loading="lazy" />
      <span>{label}</span>
    </div>
  );
}
