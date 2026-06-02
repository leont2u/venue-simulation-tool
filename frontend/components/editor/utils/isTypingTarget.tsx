export default function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return Boolean(
    element.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']",
    ),
  );
}
