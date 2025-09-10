// api/proxy.js
import fetch from "node-fetch";
import { URL } from "url";

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    res.status(400).send("Missing url query parameter");
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (err) {
    res.status(400).send("Invalid url");
    return;
  }

  try {
    // Basic safety: only allow http(s)
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      res.status(400).send("Only http(s) allowed");
      return;
    }

    // Fetch remote resource
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "UltravioletProxy/1.0 (+https://example.com)"
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";

    // If response is HTML, inject <base> so relative links resolve to original origin.
    if (contentType.includes("text/html")) {
      let text = await response.text();

      // Remove <meta http-equiv="Content-Security-Policy"...> if present in HTML (client-side meta)
      // NOTE: This is optional — some pages include CSP meta tags that can block scripts; removing them
      // may improve rendering in the proxy but may change page security behavior.
      text = text.replace(
        /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
        ""
      );

      // Inject <base> right after <head> (or prepend if no head)
      const baseHref = `${targetUrl.origin}/`;
      if (/<head[^>]*>/i.test(text)) {
        text = text.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
      } else {
        text = `<base href="${baseHref}">` + text;
      }

      // Optionally inject a small banner to remind user they're proxied (non-invasive)
      const banner = `<div id="uv-banner" style="position:fixed;right:12px;top:12px;z-index:999999;background:linear-gradient(90deg,#5b1cffaa,#00fff6aa);color:#001;border-radius:8px;padding:6px 10px;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;">Ultraviolet Proxy</div>`;
      if (/<body[^>]*>/i.test(text)) {
        text = text.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
      } else {
        text = banner + text;
      }

      // Send proxied HTML (we do not forward remote CSP headers; we set a minimal safe header)
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.status(response.status).send(text);
      return;
    }

    // For non-HTML (images, css, js, etc.) forward bytes and content-type
    const buffer = await response.buffer();
    const ct = response.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    // Prevent caching by default (optional)
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.status(response.status).send(buffer);

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error: " + err.message);
  }
}
