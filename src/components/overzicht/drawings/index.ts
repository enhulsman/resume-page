// Each drawn project's detail drawing, by the id it has in src/config/home.ts.
import HenkDrawing from "./HenkDrawing.astro";
import SandboxDrawing from "./SandboxDrawing.astro";
import HomelabDrawing from "./HomelabDrawing.astro";
import PytaigaDrawing from "./PytaigaDrawing.astro";

export const drawings = { henk: HenkDrawing, sandbox: SandboxDrawing, homelab: HomelabDrawing, pytaiga: PytaigaDrawing };
