// Core application types
export interface ArticleSettings {
  language: string
  tone: number // 0: normal, 1: first-person, 2: first-person + anecdotes, 3: third-person
  humanize: boolean
  ghost: boolean
  faqs: boolean
  youtube: boolean
  tables: boolean
  keytakes: boolean
  bold: boolean
  blockquotes: boolean
  authority: boolean
  second_image: boolean
}

export interface ArticleGenerationRequest {
  topic: string
  searchkeyword?: string
  language: string
  settings: ArticleSettings
}

export interface MetaTagsRequest {
  content: string
  language: string
}

export interface MetaTagsResponse {
  meta_title: string
  meta_description: string
}

export interface ImageAltTextRequest {
  imageUrl: string
  language: string
}

export interface User {
  id: number
  email: string
  token: string
  plan: number
}

export interface Website {
  id: number
  website_token: string
  user_token: string
  domain: string
  language: string
  enable_meta_tags: boolean
  enable_image_tags: boolean
  meta_tags: number
  image_tags: number
}

export interface Page {
  id: number
  website_token: string
  url: string
  meta_title?: string
  meta_description?: string
  processed: boolean
}

export interface ArticleSection {
  title: string
  content: string
}

export interface Language {
  code: string
  name: string
  country_code: string
}