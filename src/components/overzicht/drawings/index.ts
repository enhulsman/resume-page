// Each drawn project's detail drawing, by the id it has in src/config/home.ts.
import HenkDrawing from "./HenkDrawing.astro";
import FinanceDrawing from "./FinanceDrawing.astro";
import SandboxDrawing from "./SandboxDrawing.astro";
import HomelabDrawing from "./HomelabDrawing.astro";
import BibleDrawing from "./BibleDrawing.astro";
import PytaigaDrawing from "./PytaigaDrawing.astro";

export const drawings = { henk: HenkDrawing, finance: FinanceDrawing, sandbox: SandboxDrawing, homelab: HomelabDrawing, bible: BibleDrawing, pytaiga: PytaigaDrawing };
