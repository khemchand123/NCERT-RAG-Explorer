import { defineConfig } from "vite";

// Base path must match the Traefik PathPrefix so asset URLs
// (e.g. /ncert/assets/main.js) route correctly through the
// reverse proxy which strips /ncert before reaching the container.
export default defineConfig({
    base: "/ncert/",
});
