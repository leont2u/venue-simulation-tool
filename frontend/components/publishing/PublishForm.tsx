"use client";

import { useState } from "react";
import { EVENT_TYPE_LABELS, EventType } from "@/types/types";

export type PublishFormData = {
  title:             string;
  tagline:           string;
  event_type:        EventType | "";
  theme:             string;
  tags:              string[];
  estimated_capacity: number | null;
  cover_image_url:   string;
};

type Props = {
  initial:    Partial<PublishFormData>;
  onSubmit:   (data: PublishFormData) => void;
  isLoading:  boolean;
  submitLabel?: string;
};

export function PublishForm({ initial, onSubmit, isLoading, submitLabel = "Publish" }: Props) {
  const [form, setForm] = useState<PublishFormData>({
    title:              initial.title             ?? "",
    tagline:            initial.tagline           ?? "",
    event_type:         initial.event_type        ?? "",
    theme:              initial.theme             ?? "",
    tags:               initial.tags              ?? [],
    estimated_capacity: initial.estimated_capacity ?? null,
    cover_image_url:    initial.cover_image_url   ?? "",
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.title.trim())      next.title      = "Title is required.";
    if (!form.event_type)        next.event_type = "Select an event type.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Title */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Elegant Garden Wedding — 200pax"
          className={`px-3 py-2 text-sm border rounded-lg outline-none
            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
            ${errors.title ? "border-red-400" : "border-zinc-200"}`}
        />
        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Tagline */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700">Tagline</label>
        <input
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          placeholder="e.g. Works beautifully for outdoor receptions under a marquee"
          maxLength={500}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none
            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Event type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700">
          Event Type <span className="text-red-500">*</span>
        </label>
        <select
          value={form.event_type}
          onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
          className={`px-3 py-2 text-sm border rounded-lg outline-none bg-white
            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
            ${errors.event_type ? "border-red-400" : "border-zinc-200"}`}
        >
          <option value="">Select event type…</option>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((key) => (
            <option key={key} value={key}>{EVENT_TYPE_LABELS[key]}</option>
          ))}
        </select>
        {errors.event_type && <p className="text-xs text-red-500">{errors.event_type}</p>}
      </div>

      {/* Theme + capacity row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">Theme</label>
          <input
            value={form.theme}
            onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
            placeholder="e.g. luxury, garden, budget"
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none
              focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">Capacity</label>
          <input
            type="number"
            min={1}
            value={form.estimated_capacity ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                estimated_capacity: e.target.value ? Number(e.target.value) : null,
              }))
            }
            placeholder="e.g. 200"
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none
              focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="e.g. outdoor, marquee, floral…"
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none
              focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600"
          >
            Add
          </button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-600
                           text-xs rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-zinc-400 hover:text-zinc-700 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                   text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {isLoading ? "Publishing…" : submitLabel}
      </button>
    </form>
  );
}
