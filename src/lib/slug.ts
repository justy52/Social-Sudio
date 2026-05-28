export function createBusinessSlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || 'business'}-${suffix}`;
}
