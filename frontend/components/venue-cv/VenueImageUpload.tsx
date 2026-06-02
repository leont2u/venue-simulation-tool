"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Images, Video, X, AlertCircle } from "lucide-react";
import {
  uploadVenueImage,
  uploadVenueImages,
  uploadVenueVideo,
} from "@/hooks/usePipelineStatus";

type UploadMode = "single" | "multi" | "video";

interface Props {
  onJobStarted: (jobId: string) => void;
}

const ACCEPT_IMAGE = ".jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic,image/heif,image/webp";
const ACCEPT_VIDEO = ".mp4,.mov,.webm,.avi,video/mp4,video/quicktime,video/webm,video/x-msvideo";

export default function VenueImageUpload({ onJobStarted }: Props) {
  const [mode, setMode]         = useState<UploadMode>("single");
  const [files, setFiles]       = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const acceptAttr = mode === "video" ? ACCEPT_VIDEO : ACCEPT_IMAGE;
  const multiple   = mode === "multi";

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const list = Array.from(incoming);
      setFiles(mode === "single" || mode === "video" ? [list[0]] : list);
      setError("");
    },
    [mode],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleSubmit = async () => {
    if (!files.length) {
      setError("Please select at least one file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let resp;
      if (mode === "single") {
        resp = await uploadVenueImage(files[0]);
      } else if (mode === "multi") {
        resp = await uploadVenueImages(files);
      } else {
        resp = await uploadVenueVideo(files[0]);
      }
      onJobStarted(resp.job_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: "single", label: "Single Photo",   icon: Upload },
            { key: "multi",  label: "Multiple Photos", icon: Images },
            { key: "video",  label: "Walkthrough Video", icon: Video },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setFiles([]); setError(""); }}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-[12px] font-medium transition
              ${mode === key
                ? "border-(--sf-accent) bg-(--sf-accent)/8 text-(--sf-accent)"
                : "border-(--sf-border) text-(--sf-text-muted) hover:border-(--sf-border-strong) hover:text-(--sf-text)"
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2
          rounded-lg border-2 border-dashed p-6 text-center transition
          ${dragging
            ? "border-(--sf-accent) bg-(--sf-accent)/5"
            : "border-(--sf-border) hover:border-(--sf-border-strong)"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {files.length === 0 ? (
          <>
            <Upload className="h-6 w-6 text-(--sf-text-muted)" />
            <p className="text-[13px] font-medium text-(--sf-text)">
              {mode === "video" ? "Drop your venue video here" : "Drop venue photos here"}
            </p>
            <p className="text-[11px] text-(--sf-text-muted)">
              {mode === "video"
                ? "MP4, MOV, WebM — up to 500 MB"
                : mode === "multi"
                  ? "JPG, PNG, HEIC — up to 20 images"
                  : "JPG, PNG, HEIC — up to 20 MB"}
            </p>
          </>
        ) : (
          <div className="w-full space-y-1.5">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-(--sf-surface-soft) px-3 py-1.5"
              >
                <span className="truncate text-[12px] text-(--sf-text)">{f.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiles((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="ml-2 flex-shrink-0 text-(--sf-text-muted) hover:text-(--sf-text)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Mode info */}
      {mode === "multi" && (
        <p className="text-[11px] text-(--sf-text-muted)">
          Upload 2–20 photos from different angles for higher accuracy (Structure-from-Motion reconstruction).
        </p>
      )}
      {mode === "video" && (
        <p className="text-[11px] text-(--sf-text-muted)">
          Upload a slow walkthrough video. We extract frames, run COLMAP, and generate a high-fidelity digital twin (~10–15 min).
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || files.length === 0}
        className="w-full rounded-lg bg-(--sf-accent) px-4 py-2.5 text-[13px] font-semibold text-white
          transition hover:bg-(--sf-accent)/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Analyse Venue"}
      </button>
    </div>
  );
}
