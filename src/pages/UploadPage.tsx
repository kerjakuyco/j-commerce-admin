import { useMutation } from "@tanstack/react-query";
import { Copy, UploadCloud } from "lucide-react";
import type { DragEvent } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { request } from "../lib/api";
import { readError } from "../lib/format";
import type { UploadedFile } from "../types";

export function UploadPage() {
  const token = useToken();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!files?.length) throw new Error("Choose image files first");
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
      toast.success(`${result.length} file(s) uploaded`);
    },
    onError: (error) => toast.error(readError(error)),
  });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  }

  function handleFiles(nextFiles: FileList | null) {
    try {
      if (nextFiles) validateFiles(nextFiles);
      setFiles(nextFiles);
    } catch (error) {
      setFiles(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.error(readError(error));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }

  function validateFiles(fileList: FileList) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (fileList.length > 5) throw new Error("Upload a maximum of 5 files");
    for (const file of Array.from(fileList)) {
      if (!allowedTypes.has(file.type)) {
        throw new Error(`${file.name} must be JPG, PNG, or WEBP`);
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`${file.name} is larger than 5 MB`);
      }
    }
  }

  return (
    <div className="upload-layout">
      <Panel title="Upload assets" eyebrow="jpg png webp">
        <div
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <UploadCloud size={42} />
          <strong>Drop-ready local upload</strong>
          <span>
            Max 5 files, 5 MB each. Assets are served from the API `/uploads/*`
            path.
          </span>
          <input
            aria-label="Choose image files"
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
          <button
            className="primary-button"
            type="button"
            disabled={uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending
              ? "Uploading..."
              : "Upload selected files"}
          </button>
        </div>
      </Panel>
      <Panel title="Uploaded URLs" eyebrow={`${uploaded.length} assets`}>
        <div className="asset-list">
          {uploaded.map((file) => (
            <article key={file.filename}>
              <div>
                <strong>{file.filename}</strong>
                <span>
                  {file.mimetype} · {Math.round(file.size / 1024)} KB
                </span>
                <code>{file.url}</code>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void copy(file.url)}
              >
                <Copy size={16} /> Copy
              </button>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
