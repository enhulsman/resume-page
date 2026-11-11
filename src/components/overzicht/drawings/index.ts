// The two drawings left, each shown in a frosted pane (src/components/stone/DrawingPane.astro):
// pytaiga-mcp's, by its id in src/config/home.ts, and the henk-exactly-once post's, by its slug.
import PytaigaDrawing from "./PytaigaDrawing.astro";
import PostHenkDrawing from "./PostHenkDrawing.astro";

export const drawings = { pytaiga: PytaigaDrawing };

// A post may carry a drawn detail beside its title, by its slug; posts without one have none.
export const postDrawings: Record<string, typeof PostHenkDrawing> = { "henk-exactly-once": PostHenkDrawing };
