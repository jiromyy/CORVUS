import { MARK_SVG, MARK_VIEWBOX, WORDMARK_SVG, WORDMARK_VIEWBOX } from "./brand-art";

/**
 * The Corvus logo drawn inline: the body takes `color`, and the wordmark's eye takes `--brand-eye`,
 * so both stay visible in light and dark themes (CSS filters on an <img> flattened the eye away).
 */
export function Wordmark({ className, title = "Corvus" }: { className?: string; title?: string }) {
  return (
    <svg viewBox={WORDMARK_VIEWBOX} className={className} role="img" aria-label={title} dangerouslySetInnerHTML={{ __html: WORDMARK_SVG }} />
  );
}

/** The bird mark alone; its eye is a cut-out, so it shows whatever is behind it. */
export function Mark({ className }: { className?: string }) {
  return <svg viewBox={MARK_VIEWBOX} className={className} aria-hidden dangerouslySetInnerHTML={{ __html: MARK_SVG }} />;
}
