// 大数按语言换单位(和 App 的气泡同一个口径):中文 万 / 亿 / 万亿,日文 万 / 億 / 兆,韩文 만 / 억 / 조,英文 K / M / B / T。
// 构建脚本(node)和页面(浏览器)共用这一份。

function trim(x) {
  const v = Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2);
  return v.includes(".") ? v.replace(/\.?0+$/, "") : v;
}

const UNITS = {
  zh: ["万", "亿", "万亿"],
  ja: ["万", "億", "兆"],
  ko: ["만", "억", "조"],
};

export function bigNum(n, lang = "zh") {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (lang === "en") {
    if (a >= 1e12) return trim(v / 1e12) + "T";
    if (a >= 1e9) return trim(v / 1e9) + "B";
    if (a >= 1e6) return trim(v / 1e6) + "M";
    if (a >= 1e3) return trim(v / 1e3) + "K";
    return String(Math.round(v));
  }
  const [wan, yi, zhao] = UNITS[lang] || UNITS.zh;
  if (a >= 1e12) return trim(v / 1e12) + zhao;
  if (a >= 1e8) return trim(v / 1e8) + yi;
  if (a >= 1e4) return trim(v / 1e4) + wan;
  return String(Math.round(v));
}

export function fullNum(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function money(usd) {
  const v = Number(usd) || 0;
  return v >= 10 ? "$" + fullNum(v) : "$" + v.toFixed(2);
}

const LOCALE = { zh: "zh-CN", en: "en", ja: "ja", ko: "ko" };

export function ago(iso, lang = "zh", now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.round((t - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang] || "en", { numeric: "auto" });
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), "second");
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 45) return rtf.format(Math.round(s / 86400), "day");
  if (a < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), "month");
  return rtf.format(Math.round(s / (86400 * 365)), "year");
}

export function regionName(code, lang = "zh") {
  if (!/^[A-Z]{2}$/.test(code || "")) return "";
  try {
    return new Intl.DisplayNames([LOCALE[lang] || "en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}
