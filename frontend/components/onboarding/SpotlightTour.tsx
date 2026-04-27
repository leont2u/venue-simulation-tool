"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";

export type SpotlightTourStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
  accent?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type RectState = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isTargetOutsideViewport(rect: DOMRect) {
  const verticalMargin = 120;
  const horizontalMargin = 24;

  return (
    rect.top < verticalMargin ||
    rect.bottom > window.innerHeight - verticalMargin ||
    rect.left < horizontalMargin ||
    rect.right > window.innerWidth - horizontalMargin
  );
}

export function SpotlightTour({
  open,
  steps,
  onClose,
  onFinish,
  title = "Guided Tour",
}: {
  open: boolean;
  steps: SpotlightTourStep[];
  onClose: () => void;
  onFinish: () => void;
  title?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!open || !step) return;

    let frameId = 0;
    let timeoutId = 0;

    const updateRect = () => {
      const target = document.querySelector(step.selector);
      if (!(target instanceof HTMLElement)) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    const syncToTarget = () => {
      const target = document.querySelector(step.selector);
      if (!(target instanceof HTMLElement)) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();

      if (isTargetOutsideViewport(rect)) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        timeoutId = window.setTimeout(() => {
          frameId = window.requestAnimationFrame(updateRect);
        }, 260);
      } else {
        frameId = window.requestAnimationFrame(updateRect);
      }
    };

    syncToTarget();
    window.addEventListener("resize", syncToTarget);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", syncToTarget);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, step]);

  const cardPosition = useMemo(() => {
    if (!targetRect) {
      return {
        top: 120,
        left: 40,
        width: 360,
      };
    }

    const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
    const cardWidth = Math.min(380, viewportWidth - 32);
    const preferredLeft = targetRect.left + targetRect.width + 24;
    const canFitRight = preferredLeft + cardWidth < viewportWidth - 24;
    const left = canFitRight
      ? preferredLeft
      : clamp(targetRect.left - cardWidth - 24, 16, viewportWidth - cardWidth - 16);

    const preferredTop = targetRect.top;
    const top = clamp(preferredTop, 16, viewportHeight - 280);

    return { top, left, width: cardWidth };
  }, [targetRect]);

  if (!open || !step) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-[#17211e]/45 backdrop-blur-[1px]" />

      {targetRect ? (
        <div
          className="absolute rounded-[16px] border-2 shadow-[0_0_0_9999px_rgba(23,33,30,0.48)] transition-all duration-300"
          style={{
            top: targetRect.top - 10,
            left: targetRect.left - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
            borderColor: step.accent || "#5d7f73",
            boxShadow: `0 0 0 9999px rgba(23,33,30,0.48), 0 0 0 8px ${
              step.accent || "#5d7f73"
            }22`,
          }}
        />
      ) : null}

      {targetRect ? (
        <>
          <div
            className="absolute h-4 w-4 rounded-full opacity-40 animate-ping"
            style={{
              top: targetRect.top - 24,
              left: targetRect.left + targetRect.width / 2 - 8,
              backgroundColor: step.accent || "#5d7f73",
            }}
          />
          <div
            className="absolute flex h-4 w-4 items-center justify-center rounded-full animate-pulse"
            style={{
              top: targetRect.top - 24,
              left: targetRect.left + targetRect.width / 2 - 8,
              backgroundColor: step.accent || "#5d7f73",
            }}
          >
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
          <div
            className="absolute animate-bounce text-white drop-shadow-md"
            style={{
              top: targetRect.top - 52,
              left: targetRect.left + targetRect.width / 2 - 10,
            }}
          >
            <ArrowDown className="h-5 w-5" />
          </div>
        </>
      ) : null}

      <div
        className="absolute rounded-[16px] border border-[#dfe8e4] bg-white p-6 shadow-[0_24px_80px_rgba(23,33,30,0.24)]"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardPosition.width,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eef5f2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d7f73]">
              <Sparkles className="h-3.5 w-3.5" />
              {title}
            </div>
            <div className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-[#202927]">
              {step.title}
            </div>
          </div>

          <button
            onClick={() => {
              setStepIndex(0);
              setTargetRect(null);
              onClose();
            }}
            className="rounded-[10px] border border-[#dfe8e4] p-2 text-[#657872] transition hover:bg-[#eef5f2] hover:text-[#24302d]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-[14px] leading-7 text-[#657872]">
          {step.description}
        </p>

        {step.actionLabel && step.onAction ? (
          <button
            onClick={step.onAction}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#5d7f73] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#4e7165]"
          >
            {step.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[12px] font-medium text-[#7f918b]">
            Step {stepIndex + 1} of {steps.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#dfe8e4] px-4 py-2 text-[13px] font-semibold text-[#657872] transition hover:bg-[#eef5f2] disabled:opacity-45"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          <button
            onClick={() => {
              if (isLastStep) {
                setStepIndex(0);
                setTargetRect(null);
                onFinish();
                return;
              }
                setStepIndex((current) => Math.min(steps.length - 1, current + 1));
              }}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#202927] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#31403b]"
            >
              {isLastStep ? "Finish" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
