const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)/i;

export function firstUrl(text) {
  const m = String(text || "").match(URL_RE);
  if (!m) return null;
  let u = m[1].replace(/[),.;!?]+$/g, "");
  if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/\//, "");
  return u;
}

export async function fetchPreview(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Amg777Bot/1.0)", Accept: "text/html" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) return null;
    const html = (await res.text()).slice(0, 300000);
    const pick = (...names) => {
      for (const n of names) {
        const re = new RegExp(
          `<meta[^>]+(?:property|name)=["'](?:og:)?${n}["'][^>]+content=["']([^"']+)["']`, "i");
        const m = html.match(re) || html.match(new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${n}["']`, "i"));
        if (m) return m[1];
      }
      return null;
    };
    const host = new URL(url).hostname.replace(/^www\./, "");
    let image = pick("image", "image:secure_url");
    if (image && image.startsWith("/")) image = new URL(image, url).href;
    return {
      url,
      site: pick("site_name") || host,
      title: pick("title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || url,
      description: pick("description") || "",
      image: image || null,
    };
  } catch {
    return null;
  }
}
