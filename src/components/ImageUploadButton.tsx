import { useMutation } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { request } from "../lib/api";
import { readError } from "../lib/format";
import type { UploadedFile } from "../types";

type ImageUploadCopy = {
  uploadImage: string;
  uploading: string;
  uploaded: string;
  uploadFailed: string;
  invalidType: (name: string) => string;
  tooLarge: (name: string) => string;
};

const copy: Record<Language, ImageUploadCopy> = {
  en: {
    uploadImage: "Upload image",
    uploading: "Uploading...",
    uploaded: "Image uploaded",
    uploadFailed: "Upload response was empty",
    invalidType: (name) => `${name} must be JPG, PNG, or WEBP`,
    tooLarge: (name) => `${name} is larger than 5 MB`,
  },
  id: {
    uploadImage: "Upload gambar",
    uploading: "Mengupload...",
    uploaded: "Gambar diupload",
    uploadFailed: "Respons upload kosong",
    invalidType: (name) => `${name} harus JPG, PNG, atau WEBP`,
    tooLarge: (name) => `${name} lebih besar dari 5 MB`,
  },
};

export function ImageUploadButton({
  onUploaded,
  disabled = false,
}: {
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      validateImageFile(file, c);
      const body = new FormData();
      body.append("file", file);
      const uploaded = await request<UploadedFile>("/upload/image", {
        token,
        method: "POST",
        body,
        timeoutMs: 60_000,
      });
      if (!uploaded) throw new Error(c.uploadFailed);
      return uploaded;
    },
    onSuccess: (file) => {
      onUploaded(file.url);
      toast.success(c.uploaded);
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (error) => {
      toast.error(readError(error, language));
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  return (
    <span className="inline-upload-control">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={c.uploadImage}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) mutation.mutate(file);
        }}
      />
      <button
        className="ghost-button"
        type="button"
        disabled={disabled || mutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus size={16} /> {mutation.isPending ? c.uploading : c.uploadImage}
      </button>
    </span>
  );
}

function validateImageFile(file: File, c: ImageUploadCopy) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) throw new Error(c.invalidType(file.name));
  if (file.size > 5 * 1024 * 1024) throw new Error(c.tooLarge(file.name));
}
