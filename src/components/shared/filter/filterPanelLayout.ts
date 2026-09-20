/**
 * Shared layout constants for the filter side panel.
 *
 * On desktop the panel is docked: it sits at the right edge of the viewport and
 * `main` reserves room for it, so content genuinely narrows instead of hiding
 * underneath an overlay. On mobile it falls back to a temporary overlay drawer.
 */

/** Width of the docked desktop panel. Also the max width of the mobile drawer. */
export const FILTER_PANEL_WIDTH = 280;

/**
 * CSS variable published by the filter panel and consumed by `NavShell`.
 * Single source of truth for how much room the docked panel takes, so pages
 * never have to offset themselves.
 */
export const FILTER_PANEL_WIDTH_VAR = "--filter-panel-width";

/** At or below this width the panel overlays instead of docking. */
export const FILTER_PANEL_MOBILE_QUERY = "(max-width:900px)";
