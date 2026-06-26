import { useMutation } from "@tanstack/react-query";
import { Copy, UploadCloud, X } from "lucide-react";
import type { DragEvent } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { request } from "../lib/api";
import { normalizeAssetUrl } from "../lib/asset-url";
import { readError } from "../lib/format";
import type { UploadedFile } from "../types";

type UploadCopy = {
  chooseFirst: string;
  uploaded: (count: number) => string;
  urlCopied: string;
  couldNotCopy: string;
  maxFiles: string;
  invalidType: (name: string) => string;
  tooLarge: (name: string) => string;
  title: string;
  eyebrow: string;
  dropTitle: string;
  dropHelp: string;
  chooseFiles: string;
  noFilesSelected: string;
  selectedFiles: (count: number) => string;
  clearSelection: string;
  uploading: string;
  uploadSelected: string;
  urlsTitle: string;
  assets: (count: number) => string;
  urlsEmptyTitle: string;
  urlsEmptyBody: string;
  copy: string;
};

const uploadCopy: Record<Language, UploadCopy> = {
  en: {
    chooseFirst: "Choose image files first",
    uploaded: (count) => `${count} file(s) uploaded`,
    urlCopied: "URL copied",
    couldNotCopy: "Could not copy URL",
    maxFiles: "Upload a maximum of 5 files",
    invalidType: (name) => `${name} must be JPG, PNG, or WEBP`,
    tooLarge: (name) => `${name} is larger than 5 MB`,
    title: "Upload assets",
    eyebrow: "jpg png webp",
    dropTitle: "Drop-ready local upload",
    dropHelp: "Max 5 files, 5 MB each. Assets are served from the API `/uploads/*` path.",
    chooseFiles: "Choose files",
    noFilesSelected: "No files selected",
    selectedFiles: (count) => `${count} file(s) ready to upload`,
    clearSelection: "Clear selection",
    uploading: "Uploading...",
    uploadSelected: "Upload",
    urlsTitle: "Uploaded URLs",
    assets: (count) => `${count} assets`,
    urlsEmptyTitle: "No uploaded URLs yet",
    urlsEmptyBody: "Upload images on the left. Each finished asset will appear here with a copy-ready URL.",
    copy: "Copy",
  },
  id: {
    chooseFirst: "Pilih file gambar terlebih dahulu",
    uploaded: (count) => `${count} file diupload`,
    urlCopied: "URL disalin",
    couldNotCopy: "URL gagal disalin",
    maxFiles: "Upload maksimal 5 file",
    invalidType: (name) => `${name} harus JPG, PNG, atau WEBP`,
    tooLarge: (name) => `${name} lebih besar dari 5 MB`,
    title: "Upload aset",
    eyebrow: "jpg png webp",
    dropTitle: "Upload lokal siap drop",
    dropHelp:
      "Maksimal 5 file, masing-masing 5 MB. Aset disajikan dari path API `/uploads/*`.",
    chooseFiles: "Pilih file",
    noFilesSelected: "Belum ada file dipilih",
    selectedFiles: (count) => `${count} file siap diupload`,
    clearSelection: "Bersihkan pilihan",
    uploading: "Mengupload...",
    uploadSelected: "Upload",
    urlsTitle: "URL yang diupload",
    assets: (count) => `${count} aset`,
    urlsEmptyTitle: "Belum ada URL upload",
    urlsEmptyBody:
      "Upload gambar dari panel kiri. Setiap aset yang selesai akan muncul di sini dengan URL siap Copy.",
    copy: "Copy",
  },
};

export function UploadPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = uploadCopy[language];
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedFiles = files ? Array.from(files) : [];
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!files?.length) throw new Error(c.chooseFirst);
      validateFiles(files);
      const body = new FormData();
      if (files.length === 1) {
        body.append("file", files[0]);
        const single = await request<UploadedFile>("/upload/image", {
          token,
          method: "POST",
          body,
          timeoutMs: 60_000,
        });
        return single ? [single] : [];
      }
      Array.from(files).forEach((file) => body.append("files", file));
      return (
        (await request<UploadedFile[]>("/upload/images", {
          token,
          method: "POST",
          body,
          timeoutMs: 60_000,
        })) ?? []
      );
    },
    onSuccess: (result) => {
      setUploaded(result);
      setFiles(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(c.uploaded(result.length));
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  async function copyUrl(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(c.urlCopied);
    } catch {
      toast.error(c.couldNotCopy);
    }
  }

  function handleFiles(nextFiles: FileList | null) {
    try {
      if (nextFiles) validateFiles(nextFiles);
      setFiles(nextFiles?.length ? nextFiles : null);
    } catch (error) {
      setFiles(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.error(readError(error, language));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }

  function clearSelection() {
    setFiles(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function validateFiles(fileList: FileList) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (fileList.length > 5) throw new Error(c.maxFiles);
    for (const file of Array.from(fileList)) {
      if (!allowedTypes.has(file.type)) {
        throw new Error(c.invalidType(file.name));
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(c.tooLarge(file.name));
      }
    }
  }

  return (
    <div className="upload-layout">
      <Panel title={c.title} eyebrow={c.eyebrow} className="upload-main-panel">
        <div
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <span className="dropzone-icon">
            <UploadCloud size={32} aria-hidden="true" />
          </span>
          <strong>{c.dropTitle}</strong>
          <span>{c.dropHelp}</span>
          <input
            className="sr-only"
            aria-label={c.chooseFiles}
            name="files"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              handleFiles(event.target.files);
              if (event.target.files && event.target.files.length > 5) {
                event.currentTarget.value = "";
              }
            }}
          />
          <div className="dropzone-picker" aria-live="polite">
            <div className="dropzone-file-status">
              <div>
                <strong>
                  {selectedFiles.length
                    ? c.selectedFiles(selectedFiles.length)
                    : c.noFilesSelected}
                </strong>
                {selectedFiles.length > 0 && (
                  <button
                    className="text-copy-button"
                    type="button"
                    onClick={clearSelection}
                  >
                    <X size={14} aria-hidden="true" /> {c.clearSelection}
                  </button>
                )}
              </div>
              <button
                className="ghost-button compact-button"
                type="button"
                disabled={uploadMutation.isPending}
                onClick={() => inputRef.current?.click()}
              >
                {c.chooseFiles}
              </button>
            </div>
            {selectedFiles.length > 0 && (
              <div className="dropzone-file-list">
                {selectedFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} title={file.name}>
                    <strong>{file.name}</strong>
                    <small>{Math.round(file.size / 1024)} KB</small>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="dropzone-actions">
            <button
              className="primary-button"
              type="button"
              disabled={uploadMutation.isPending || selectedFiles.length === 0}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? c.uploading : c.uploadSelected}
            </button>
          </div>
        </div>
      </Panel>
      <Panel
        title={c.urlsTitle}
        eyebrow={c.assets(uploaded.length)}
        className="upload-urls-panel"
      >
        <div className="asset-list">
          {uploaded.length === 0 ? (
            <div className="asset-list-empty">
              <span className="asset-list-empty-icon">
                <Copy size={20} aria-hidden="true" />
              </span>
              <strong>{c.urlsEmptyTitle}</strong>
              <p>{c.urlsEmptyBody}</p>
            </div>
          ) : (
            uploaded.map((file) => (
              <article className="asset-card" key={file.filename}>
                <img
                  className="asset-card-thumb"
                  src={normalizeAssetUrl(file.url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="asset-card-main">
                  <strong title={file.filename}>{file.filename}</strong>
                  <span className="asset-card-meta">
                    {file.mimetype} · {Math.round(file.size / 1024)} KB
                  </span>
                  <code title={file.url}>{file.url}</code>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => void copyUrl(file.url)}
                >
                  <Copy size={16} /> {c.copy}
                </button>
              </article>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
