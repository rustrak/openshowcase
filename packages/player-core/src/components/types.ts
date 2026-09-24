/**
 * Shared prop/data shapes for components. Kept in a plain .ts module rather than exported
 * from a .svelte file — TypeScript's ambient `*.svelte` module shim only recognizes the
 * default export, not named exports from the component's `<script>` block.
 */
export interface NavbarSegment {
  /** Fill progress within the segment, 0-1. */
  progress: number;
  /** The currently playing/paused step — rendered wider than the rest. */
  active: boolean;
  /** A step already passed — fill goes fully white instead of the accent color. */
  done: boolean;
}
