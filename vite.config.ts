import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Fills %SITE_URL% in index.html from VITE_SITE_URL.
 *
 * Deliberately not named %VITE_SITE_URL%: Vite substitutes those itself, before
 * this runs, so a trailing slash would survive into "…co.uk//og-image.png" and
 * an unset value would ship the literal placeholder. Owning the whole
 * substitution means it degrades to a relative "/og-image.png" when unset and
 * normalises the slash when set.
 */
function htmlEnv(siteUrl: string): Plugin {
  return {
    name: "html-site-url",
    transformIndexHtml(html) {
      return html.replaceAll("%SITE_URL%", siteUrl.replace(/\/+$/, ""));
    },
  };
}

/**
 * Where the app is served from, for the absolute Open Graph image URL.
 *
 * VITE_SITE_URL wins. Failing that, Vercel exposes the project's production
 * domain to the build, so a Vercel deploy resolves this on its own rather than
 * needing the variable set by hand. Anywhere else falls back to a relative
 * path, which most scrapers still resolve.
 */
function resolveSiteUrl(env: Record<string, string>): string {
  if (env.VITE_SITE_URL) return env.VITE_SITE_URL;
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), htmlEnv(resolveSiteUrl(env))],
  };
});
