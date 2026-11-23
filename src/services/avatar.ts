/**
 * Picture shown when a person has no photo: their initials on a neutral background.
 * (Never a stock photo, which would make a stranger look like the member.)
 */
export function initialsAvatar(name?: string | null): string {
  const initials =
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" fill="#E2E8F0"/>` +
    `<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#475569">${initials
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
