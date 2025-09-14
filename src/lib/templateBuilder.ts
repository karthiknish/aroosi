// Declarative email template builder: simple, safe HTML output for marketing
// emails. Uses table-based layout for broad client compatibility.

export type BuilderTheme = {
  width?: number; // content width in px, default 600
  fontFamily?: string; // default system font stack
  brandColor?: string; // CTA/button color, default #2563EB
  backgroundColor?: string; // page background, default #f5f7fb
  textColor?: string; // default #111827
  linkColor?: string; // default brandColor
};

export type BuilderCTA = { label: string; url: string };

export type BuilderSection =
  | { type: "hero"; title: string; subtitle?: string; cta?: BuilderCTA; imageUrl?: string; align?: "left" | "center" }
  | { type: "paragraph"; text: string; align?: "left" | "center" }
  | { type: "richParagraph"; html: string; align?: "left" | "center" }
  | { type: "button"; cta: BuilderCTA; align?: "left" | "center" }
  | { type: "image"; src: string; alt?: string; width?: number; align?: "left" | "center" }
  | { type: "imageText"; image: { src: string; alt?: string; width?: number }; html: string; imagePosition?: "left" | "right" }
  | { type: "columns"; columns: Array<{ html: string }>; columnCount?: 2 | 3 }
  | { type: "divider" }
  | { type: "spacer"; size?: number };

export type BuilderSchema = {
  subject: string;
  preheader?: string;
  theme?: BuilderTheme;
  header?: { logoUrl?: string; title?: string };
  footer?: { text?: string; addressHtml?: string };
  sections: BuilderSection[];
};

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderButton(cta: BuilderCTA, theme: Required<BuilderTheme>, align: "left" | "center" = "left") {
  const inner = `<a href="${esc(cta.url)}" style="display:inline-block;background:${theme.brandColor};color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">${esc(cta.label)}</a>`;
  return wrapBlock(inner, align);
}

function wrapBlock(innerHtml: string, align: "left" | "center" = "left") {
  const alignAttr = align === "center" ? "center" : "left";
  return `<tr><td align="${alignAttr}" style="padding:0 24px 16px 24px">${innerHtml}</td></tr>`;
}

// Minimal sanitizer for rich HTML: strips scripts/styles and unsafe attrs
function sanitizeHtml(input: string): string {
  // Remove script and style tags and their content
  let out = input.replace(/<\/(script|style)>/gi, "").replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, "");
  // Remove event handler attributes and javascript: urls
  out = out.replace(/ on[a-z]+="[^"]*"/gi, "").replace(/ on[a-z]+='[^']*'/gi, "");
  out = out.replace(/javascript:/gi, "");
  // Whitelist a, strong, em, b, i, u, p, br, ul, ol, li, h1-h4, img (only src,alt,width,height)
  // Strip unknown tags by escaping angle brackets (basic approach)
  out = out.replace(/<\s*(?!\/?(a|strong|em|b|i|u|p|br|ul|ol|li|h1|h2|h3|h4|img)(\s|>|\/))/gi, "&lt;");
  // For <img>, strip all attributes except src,alt,width,height
  out = out.replace(/<img([^>]*)>/gi, (m, attrs) => {
    const allowed: string[] = [];
    const srcMatch = attrs.match(/\ssrc=("[^"]*"|'[^']*')/i);
    const altMatch = attrs.match(/\salt=("[^"]*"|'[^']*')/i);
    const wMatch = attrs.match(/\swidth=("[^"]*"|'[^']*'|\d+)/i);
    const hMatch = attrs.match(/\sheight=("[^"]*"|'[^']*'|\d+)/i);
    if (srcMatch) allowed.push(` src=${srcMatch[1]}`);
    if (altMatch) allowed.push(` alt=${altMatch[1]}`);
    if (wMatch) allowed.push(` width=${wMatch[1]}`);
    if (hMatch) allowed.push(` height=${hMatch[1]}`);
    return `<img${allowed.join("")}>`;
  });
  return out;
}

export function renderBuiltTemplate(schema: BuilderSchema): { subject: string; html: string } {
  const theme: Required<BuilderTheme> = {
    width: schema.theme?.width || 600,
    fontFamily: schema.theme?.fontFamily || "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    brandColor: schema.theme?.brandColor || "#2563EB",
    backgroundColor: schema.theme?.backgroundColor || "#f5f7fb",
    textColor: schema.theme?.textColor || "#111827",
    linkColor: schema.theme?.linkColor || schema.theme?.brandColor || "#2563EB",
  };

  const parts: string[] = [];
  // Header
  if (schema.header?.logoUrl || schema.header?.title) {
    const logo = schema.header.logoUrl
      ? `<img src="${esc(schema.header.logoUrl)}" alt="" style="max-height:40px;display:block" />`
      : "";
    const title = schema.header.title ? `<div style=\"font-size:16px;font-weight:600;margin-top:8px;color:${theme.textColor}\">${esc(schema.header.title)}</div>` : "";
    parts.push(wrapBlock(`<div style="display:flex;gap:12px;align-items:center">${logo}${title}</div>`, "left"));
  }

  // Sections
  for (const s of schema.sections) {
    if (s.type === "hero") {
      const title = `<div style="font-size:24px;line-height:1.25;font-weight:700;color:${theme.textColor}">${esc(s.title)}</div>`;
      const subtitle = s.subtitle
        ? `<div style="font-size:16px;line-height:1.6;color:${theme.textColor};opacity:.8;margin-top:6px">${esc(s.subtitle)}</div>`
        : "";
      const image = s.imageUrl
        ? `<img src="${esc(s.imageUrl)}" alt="" style="max-width:100%;border-radius:8px;margin-top:12px" />`
        : "";
      const cta = s.cta ? renderButton(s.cta, theme, s.align) : "";
      parts.push(wrapBlock(`${title}${subtitle}${image}`, s.align));
      if (cta) parts.push(cta);
    } else if (s.type === "paragraph") {
      parts.push(
        wrapBlock(
          `<div style="font-size:16px;line-height:1.7;color:${theme.textColor}">${esc(
            s.text
          )}</div>`,
          s.align
        )
      );
    } else if (s.type === "richParagraph") {
      const clean = sanitizeHtml(s.html);
      parts.push(
        wrapBlock(
          `<div style="font-size:16px;line-height:1.7;color:${theme.textColor}">${clean}</div>`,
          s.align
        )
      );
    } else if (s.type === "button") {
      parts.push(renderButton(s.cta, theme, s.align));
    } else if (s.type === "image") {
      const w = s.width ? `max-width:${s.width}px;` : "max-width:100%;";
      parts.push(
        wrapBlock(
          `<img src="${esc(s.src)}" alt="${esc(s.alt || "")}" style="${w}display:block;border-radius:8px" />`,
          s.align
        )
      );
    } else if (s.type === "imageText") {
      const imgW = s.image.width ? `${s.image.width}px` : "100%";
      const clean = sanitizeHtml(s.html);
      const imgCell = `<td width="50%" valign="top" style="padding:0 12px 0 0"><img src="${esc(
        s.image.src
      )}" alt="${esc(s.image.alt || "")}" style="max-width:${imgW};display:block;border-radius:8px" /></td>`;
      const textCell = `<td width="50%" valign="top" style="padding:0 0 0 12px"><div style="font-size:16px;line-height:1.7;color:${theme.textColor}">${clean}</div></td>`;
      const cells = s.imagePosition === "right" ? `${textCell}${imgCell}` : `${imgCell}${textCell}`;
      parts.push(
        wrapBlock(
          `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${cells}</tr></table>`,
          "left"
        )
      );
    } else if (s.type === "columns") {
      const count = Math.max(2, Math.min(3, s.columnCount || s.columns.length || 2));
      const cols = (s.columns || []).slice(0, count);
      const widthPct = Math.floor(100 / count);
      const cells = cols
        .map((c, idx) => {
          const clean = sanitizeHtml(c.html || "");
          const padLeft = idx === 0 ? "0" : "12px";
          const padRight = idx === count - 1 ? "0" : "12px";
          return `<td width="${widthPct}%" valign="top" style="padding:0 ${padRight} 0 ${padLeft}"><div style="font-size:16px;line-height:1.7;color:${theme.textColor}">${clean}</div></td>`;
        })
        .join("");
      parts.push(
        wrapBlock(
          `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${cells}</tr></table>`,
          "left"
        )
      );
    } else if (s.type === "divider") {
      parts.push(
        wrapBlock(
          `<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:8px 0" />`,
          "left"
        )
      );
    } else if (s.type === "spacer") {
      const h = Math.max(8, Math.min(64, s.size || 16));
      parts.push(`<tr><td style="height:${h}px;line-height:${h}px">&nbsp;</td></tr>`);
    }
  }

  // Footer
  if (schema.footer?.text || schema.footer?.addressHtml) {
    const text = schema.footer.text
      ? `<div style="font-size:12px;line-height:1.6;color:${theme.textColor};opacity:.7">${esc(schema.footer.text)}</div>`
      : "";
    const addr = schema.footer.addressHtml
      ? `<div style="font-size:12px;line-height:1.6;color:${theme.textColor};opacity:.7;margin-top:4px">${schema.footer.addressHtml}</div>`
      : "";
    parts.push(wrapBlock(`${text}${addr}`, "left"));
  }

  const preheader = schema.preheader
    ? `<div style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(schema.preheader)}</div>`
    : "";

  const html = `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:${theme.backgroundColor};">
    ${preheader}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${theme.backgroundColor};padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="${theme.width}" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.04);font-family:${theme.fontFamily}">
            ${parts.join("\n")}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject: schema.subject, html };
}
