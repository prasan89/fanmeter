const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanmeter.in";

interface BreadcrumbItem {
  name: string;
  href: string;
}

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** WebSite schema — inject once in root layout */
export function WebSiteSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "FanMeter",
        url: SITE_URL,
        description:
          "Independent fan community polls and rankings for Bigg Boss Tamil, Telugu, Malayalam, Kannada, Hindi, and Bangla.",
        publisher: {
          "@type": "Organization",
          name: "FanMeter",
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/og-default.jpg`,
          },
        },
      }}
    />
  );
}

/** Organization schema — inject once in root layout alongside WebSiteSchema */
export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "FanMeter",
        url: SITE_URL,
        description:
          "FanMeter is an independent fan community platform for Bigg Boss Tamil, Telugu, Malayalam, Kannada, Hindi, and Bangla. Not affiliated with Bigg Boss or its broadcasters.",
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/og-default.jpg`,
          width: 1200,
          height: 630,
        },
        sameAs: [],
      }}
    />
  );
}

/** BreadcrumbList schema — inject on pages with navigation hierarchy */
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.href.startsWith("http")
            ? item.href
            : `${SITE_URL}${item.href}`,
        })),
      }}
    />
  );
}
