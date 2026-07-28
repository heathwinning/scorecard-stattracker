import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard-stattracker.pages.dev";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/join/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
