export function resolveAssetUrl(path: string, baseUrl: string, documentBase?: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const relativeUrl = `${base}${path.replace(/^\/+/, '')}`;

  // With Vite's relative `./` base, URLs stored in CSS custom properties are
  // otherwise resolved against the emitted stylesheet (…/assets/), producing
  // `assets/assets/...` on GitHub Pages. Resolve against the document while the
  // module is running in a browser so every consumer gets one canonical URL.
  if (documentBase) {
    return new URL(relativeUrl, documentBase).href;
  }

  return relativeUrl;
}

/** Resolve public assets against Vite's deployment base (localhost or Pages). */
export function assetUrl(path: string): string {
  return resolveAssetUrl(
    path,
    import.meta.env.BASE_URL,
    typeof document === 'undefined' ? undefined : document.baseURI,
  );
}
