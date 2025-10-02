declare module '@tryghost/admin-api' {
  interface GhostAdminAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  interface GhostPost {
    id?: string;
    title: string;
    lexical?: string;
    html?: string;
    status?: 'draft' | 'published';
    slug?: string;
    custom_excerpt?: string;
    published_at?: string;
    feature_image?: string;
    meta_title?: string;
    meta_description?: string;
    tags?: Array<{ name: string }>;
    url?: string;
  }

  interface GhostSiteInfo {
    title?: string;
    description?: string;
    version?: string;
  }

  interface GhostAdminAPI {
    posts: {
      add(data: GhostPost, options?: { source?: string }): Promise<GhostPost>;
      browse(options?: { limit?: number }): Promise<GhostPost[]>;
      delete(options: { id: string }): Promise<void>;
    };
    site: {
      read(): Promise<GhostSiteInfo>;
    };
  }

  interface GhostAdminAPIConstructor {
    new (options: GhostAdminAPIOptions): GhostAdminAPI;
  }

  const GhostAdminAPI: GhostAdminAPIConstructor;
  export default GhostAdminAPI;
}
