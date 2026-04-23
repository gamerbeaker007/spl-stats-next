import {
  credits_icon_url,
  dec_icon_url,
  glint_icon_url,
  merits_icon_url,
  other_icon_url,
  sps_icon_url,
  voucher_icon_url,
  WEB_URL,
} from "@/lib/staticsIconUrls";

export const PROXY20 = "https://images.hive.blog/20x0/";
export const PROXY50 = "https://images.hive.blog/50x0/";
export const PROXY150 = "https://images.hive.blog/150x0/";

export function img(url: string, size: number = 20): string {
  const proxyUrl = PROXY20.replace("20", String(size));
  return `![](${proxyUrl}${url})`;
}

export const TOKEN_ICONS: Record<string, string> = {
  DEC: img(dec_icon_url),
  "DEC-B": img(dec_icon_url),
  SPS: img(sps_icon_url),
  SPSP: img(sps_icon_url),
  "SPSP-IN": img(sps_icon_url),
  "SPSP-OUT": img(sps_icon_url),
  UNCLAIMED_SPS: img(sps_icon_url),
  MERITS: img(merits_icon_url),
  VOUCHER: img(voucher_icon_url),
  "VOUCHER-G": img(voucher_icon_url),
  GLINT: img(glint_icon_url),
  CREDITS: img(credits_icon_url),
  UNCLAIMED_VOUCHER: img(voucher_icon_url),
};

export function tokenIcon(token: string): string {
  return TOKEN_ICONS[token] ?? img(other_icon_url);
}

export function leagueIconMd(format: string, leagueNum: number | null): string {
  if (leagueNum == null) return "";
  const folder = format === "modern" ? "modern_150" : "wild_150";
  const url = `${WEB_URL}website/icons/leagues/${folder}/league_${leagueNum}.png`;
  return img(url, 75);
}
