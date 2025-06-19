import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://aroosi.app';
  const currentDate = new Date().toISOString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">

  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Main pages -->
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/pricing</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>${baseUrl}/faq</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>${baseUrl}/how-it-works</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Blog pages -->
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Legal pages -->
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Auth pages (low priority as they're mostly for existing users) -->
  <url>
    <loc>${baseUrl}/sign-up</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>${baseUrl}/sign-in</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}