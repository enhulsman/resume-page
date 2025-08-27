import site from "../config/site";
import { md5Hex } from "./md5";

// Gravatar setup (same logic as Header.astro)
const normalized = site.email.trim().toLowerCase();
const gravatarHash = normalized ? await md5Hex(normalized) : '';
export const gravatarUrl = gravatarHash ? `https://www.gravatar.com/avatar/${gravatarHash}?s=256&d=404` : '/avatar.svg';