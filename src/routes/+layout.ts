// Tauri ships a static bundle, so every route must be prerenderable and there is
// no server to render on: the shell is prerendered once and hydrated in the
// webview. Without this the static adapter rejects the build outright, which
// also means `frontendDist` (`../build`) would never exist for `tauri build`.
export const prerender = true;
export const ssr = false;
