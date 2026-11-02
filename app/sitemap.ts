import type { MetadataRoute } from "next";
import { defineQuery } from "next-sanity";
import { env } from "~/env";
import { sanityFetch } from "~/features/sanity/client";
import { SANITY_PROJECT_DOCUMENT_TYPE, SANITY_SINGLETON_HOMEPAGE_ID } from "~/sanity/constants";
import type { ProjectSitemapQResult, SitemapQResult } from "~/sanity/types";

const SitemapQ = defineQuery(`
  *[defined(uri.current) && seoMetadata.noIndex != true && passwordProtected != true]{
    "uri": uri.current,
    "updatedAt": _updatedAt,
    "freq": select(
      _id == "${SANITY_SINGLETON_HOMEPAGE_ID}" => "daily",
      true => "weekly",
    ),
    "priority": select(
      _id == "${SANITY_SINGLETON_HOMEPAGE_ID}" => 1,
      true => 0.8,
    ),
  }
`);

// Projects live at /project/<slug> (they carry a slug, not a uri), so they need their own entries.
const ProjectSitemapQ = defineQuery(`
  *[_type == "${SANITY_PROJECT_DOCUMENT_TYPE}" && defined(slug.current) && !(hidden == true)]{
    "slug": slug.current,
    "updatedAt": _updatedAt,
  }
`);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, projects] = await Promise.all([
    sanityFetch<SitemapQResult>({
      query: SitemapQ,
      // Refresh at most hourly via the Data Cache instead of hitting Sanity every request.
      options: { next: { revalidate: 3600 } },
    }),
    sanityFetch<ProjectSitemapQResult>({
      query: ProjectSitemapQ,
      options: { next: { revalidate: 3600 } },
    }),
  ]);

  const pageEntries: MetadataRoute.Sitemap = entries.map((entry) => ({
    url: `${env.NEXT_PUBLIC_URL}${entry.uri}`,
    lastModified: new Date(entry.updatedAt),
    changeFrequency: entry.freq,
    priority: entry.priority,
  }));

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${env.NEXT_PUBLIC_URL}/project/${project.slug}`,
    lastModified: new Date(project.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Hard-coded routes that aren't Sanity page docs (so they don't come through the query above).
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${env.NEXT_PUBLIC_URL}/wonders-of-reflection`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  return [...pageEntries, ...projectEntries, ...staticEntries];
}
