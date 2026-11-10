/** Keep API, speech and static requests inside the configured deployment directory. */
export function appUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '');
}
