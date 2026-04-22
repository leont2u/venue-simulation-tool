"use client";

import { useMemo, useState } from "react";
import { Project } from "@/types/types";
import { exportProjectAsPdf, exportProjectAsPng } from "@/lib/floorplanExport";
import { createShareToken } from "@/lib/shareProject";

export function ShareExportModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");
  const shareUrl = useMemo(() => {
    if (generatedShareUrl) return generatedShareUrl;
    if (typeof window === "undefined" || !project) return "";
    return `${window.location.origin}/shared?s=...`;
  }, [generatedShareUrl, project]);

  const handleClose = () => {
    setGeneratedShareUrl("");
    setStatus("");
    setError("");
    onClose();
  };

  const handleCopy = async () => {
    if (!shareUrl || !project) return;

    try {
      const token = await createShareToken(project.id);
      const url = `${window.location.origin}/shared?s=${token}`;
      setGeneratedShareUrl(url);
      await navigator.clipboard.writeText(url);
      setError("");
      setStatus("Share link copied.");
    } catch {
      setStatus("");
      setError("Failed to copy the share link.");
    }
  };

  const handleExportPng = () => {
    if (!project) return;

    try {
      exportProjectAsPng(project);
      setError("");
      setStatus("PNG export started.");
    } catch (exportError) {
      setStatus("");
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export PNG.",
      );
    }
  };

  const handleExportPdf = () => {
    if (!project) return;

    try {
      exportProjectAsPdf(project);
      setError("");
      setStatus("Print dialog opened for PDF export.");
    } catch (exportError) {
      setStatus("");
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export PDF.",
      );
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_30px_100px_rgba(47,62,70,0.18)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-3xl font-semibold text-[#2F3E46]">
              Share or export
            </div>
            <div className="mt-2 text-[#52796F]">
              {project?.name || "Project"}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-3xl text-[#52796F] hover:text-[#2F3E46]"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-[#F7F8F5] p-4">
            <div className="text-lg font-semibold text-[#2F3E46]">Share link</div>
            <div className="mt-2 text-sm text-[#52796F]">
              Opens an interactive 3D viewer in view-only mode.
            </div>
            <input
              readOnly
              value={shareUrl}
              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm text-[#354F52]"
            />
            <button
              onClick={handleCopy}
              className="mt-3 rounded-xl bg-[#84A98C] px-4 py-2 text-sm font-medium text-white hover:bg-[#52796F]"
            >
              Copy link
            </button>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#F7F8F5] p-4">
            <div className="text-lg font-semibold text-[#2F3E46]">Export</div>
            <div className="mt-2 text-sm text-[#52796F]">
              Export a simple 2D floorplan for clients and print-ready review.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleExportPng}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-[#354F52]"
              >
                Export PNG
              </button>
              <button
                onClick={handleExportPdf}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-[#354F52]"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded-2xl border border-[#84A98C]/30 bg-[#84A98C]/10 px-4 py-3 text-sm text-[#2F3E46]">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-black/10 bg-[#F7F8F5] p-4">
          <div className="text-lg font-semibold text-[#2F3E46]">
            Client viewing
          </div>
          <div className="mt-2 text-sm text-[#52796F]">
            Shared layouts open in a browser-based 3D viewer without edit tools.
            Comment threads are not included in this first version.
          </div>
        </div>
      </div>
    </div>
  );
}
