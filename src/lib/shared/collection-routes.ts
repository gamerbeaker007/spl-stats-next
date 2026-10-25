const CART_CHROME_EXCLUDED_PREFIXES = [
  "/collection/skins",
  "/collection/music",
  "/collection/packs",
  "/collection/titles",
  "/collection/consumables",
  "/collection/collector-stickers",
  "/collection/totems",
  "/collection/land",
];

export function isCollectionCartAvailable(pathname: string): boolean {
  return (
    (pathname === "/collection" || pathname.startsWith("/collection/")) &&
    !CART_CHROME_EXCLUDED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
}
