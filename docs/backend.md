# Backend Documentation

# Backend API Documentation

This documentation provides a comprehensive overview of the backend API, including routes, functions, and error handling. Each section is designed to help developers understand and effectively utilize the API.

## Table of Contents
- [1. Strapi Publishing Debug & Fix Summary](#1-strapi-publishing-debug--fix-summary)
- [2. Admin Tool API](#2-admin-tool-api)
- [3. Strapi CMS Configuration](#3-strapi-cms-configuration)
- [4. UI Component → API Mapping](#4-ui-component--api-mapping)

---

## 1. Strapi Publishing Debug & Fix Summary

### Issues Identified & Fixed ✅

#### 1.1 CMS Manager Database Schema Mismatch
- **Problem**: CMS Manager was using modern schema (`user_id`, `is_active`) but the database has a legacy schema (`user_token`, `status`).
- **Error**: `400 Bad Request` when querying `cms_connections` table.
- **Fixed**: Updated `/src/lib/cms/cms-manager.ts` to use correct column names:
  - `user_id` → `user_token`
  - `is_active` → `status = 'active'`
  - Updated `dbRecordToConnection()` to map legacy schema properly.

#### 1.2 Created Supabase Edge Function
- **File**: `/supabase/functions/publish-article/index.ts`
- **Purpose**: Replace Vercel Edge Functions with Supabase Edge Functions.
- **Features**:
  - Same publishing logic as current API.
  - Improved Strapi content type parsing.
  - Better error handling and logging.
  - CORS support for frontend calls.

### Current Strapi Publishing Error Analysis
The error you're seeing:
```
"Method not allowed for endpoint: api::blog-post.blog-post"
```

---

## 2. Admin Tool API

### Routes Overview
| HTTP Method | Route                          | Description                          |
|-------------|--------------------------------|--------------------------------------|
| GET         | `/api/health`                 | Check the health of the API         |
| GET         | `/api/websites`               | Retrieve all websites                |
| GET         | `/api/websites/:token`        | Retrieve a specific website          |
| POST        | `/api/test-endpoints/:token`   | Test specific endpoints              |
| POST        | `/api/websites`               | Create a new website                 |
| GET         | `/api/users`                  | Retrieve all users                   |
| GET         | `/api/env`                    | Get environment variables            |
| GET         | `/`                            | Root endpoint                        |

### Example Route Implementation
```typescript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Error Handling
- **Common Errors**:
  - `404 Not Found`: When the requested resource does not exist.
  - `500 Internal Server Error`: For unexpected server errors.

---

## 3. Strapi CMS Configuration

### Configuration Files Overview

#### 3.1 Server Configuration
- **File**: `strapi-cms/config/server.ts`
```typescript
export default ({ env }: { env: any }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
```

#### 3.2 Plugin Configuration
- **File**: `strapi-cms/config/plugins.ts`
```typescript
export default () => ({});
```

---

## 4. UI Component → API Mapping

| Slug           | Service Function                | Linked Components       | Purpose                                   | Parameters                                   | Response                                     | Error Handling                             | Database Operations                      |
|----------------|----------------------------------|-------------------------|-------------------------------------------|----------------------------------------------|----------------------------------------------|-------------------------------------------|------------------------------------------|
| `get-health`   | `GET /api/health`               | HealthCheckComponent     | Check API health                          | None                                         | `{ status: 'ok', timestamp: 'ISOString' }` | `500 Internal Server Error`               | None                                     |
| `get-websites` | `GET /api/websites`             | WebsiteListComponent     | Retrieve all websites                     | None                                         | `[{ id: 1, name: 'Website 1' }, ...]`     | `404 Not Found`                           | Read from `websites` table              |
| `post-websites`| `POST /api/websites`            | WebsiteFormComponent     | Create a new website                      | `{ name: string, url: string }`             | `{ id: 1, name: 'New Website' }`           | `400 Bad Request`, `500 Internal Server Error` | Insert into `websites` table            |
| `get-users`    | `GET /api/users`                | UserListComponent        | Retrieve all users                        | None                                         | `[{ id: 1, email: 'user@example.com' }, ...]` | `404 Not Found`                           | Read from `users` table                 |

---

This documentation serves as a guide for developers to understand the backend API's structure, functionality, and error handling. For any further questions or clarifications, please refer to the codebase or reach out to the development team.

## API Endpoints

### GET /api/health {#get-api-health}

GET endpoint for /api/health

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /api/websites {#get-api-websites}

GET endpoint for /api/websites

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /api/websites/:token {#get-api-websites-token}

GET endpoint for /api/websites/:token

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /api/test-endpoints/:token {#post-api-test-endpoints-token}

POST endpoint for /api/test-endpoints/:token

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /api/websites {#post-api-websites}

POST endpoint for /api/websites

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /api/users {#get-api-users}

GET endpoint for /api/users

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /api/env {#get-api-env}

GET endpoint for /api/env

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET / {#get}

GET endpoint for /

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET gsc_connected {#get-gsc-connected}

GET endpoint for gsc_connected

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET error {#get-error}

GET endpoint for error

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET details {#get-details}

GET endpoint for details

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET / {#get}

GET endpoint for /

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Authorization {#get-authorization}

GET endpoint for Authorization

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET token {#get-token}

GET endpoint for token

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET token {#get-token}

GET endpoint for token

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET OPENAI_API_KEY {#get-openai-api-key}

GET endpoint for OPENAI_API_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET OPENAI_API_KEY {#get-openai-api-key}

GET endpoint for OPENAI_API_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET OPENAI_API_KEY {#get-openai-api-key}

GET endpoint for OPENAI_API_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET OPENAI_API_KEY {#get-openai-api-key}

GET endpoint for OPENAI_API_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_URL {#get-supabase-url}

GET endpoint for SUPABASE_URL

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET SUPABASE_SERVICE_ROLE_KEY {#get-supabase-service-role-key}

GET endpoint for SUPABASE_SERVICE_ROLE_KEY

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Location {#get-location}

GET endpoint for Location

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Location {#get-location}

GET endpoint for Location

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE index {#delete-index}

DELETE endpoint for index

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Content-Type {#get-content-type}

GET endpoint for Content-Type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Location {#get-location}

GET endpoint for Location

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE index {#delete-index}

DELETE endpoint for index

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE Content-Type {#delete-content-type}

DELETE endpoint for Content-Type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE Content-Type {#delete-content-type}

DELETE endpoint for Content-Type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET content-type {#get-content-type}

GET endpoint for content-type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET content-length {#get-content-length}

GET endpoint for content-length

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET field {#get-field}

GET endpoint for field

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET redirectTo {#get-redirectto}

GET endpoint for redirectTo

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET info {#get-info}

GET endpoint for info

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET registrationToken {#get-registrationtoken}

GET endpoint for registrationToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET code {#get-code}

GET endpoint for code

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET code {#get-code}

GET endpoint for code

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET field {#get-field}

GET endpoint for field

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET region {#get-region}

GET endpoint for region

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET vertical {#get-vertical}

GET endpoint for vertical

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET line {#get-line}

GET endpoint for line

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET lineAlign {#get-linealign}

GET endpoint for lineAlign

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET snapToLines {#get-snaptolines}

GET endpoint for snapToLines

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET size {#get-size}

GET endpoint for size

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET align {#get-align}

GET endpoint for align

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET position {#get-position}

GET endpoint for position

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET age {#get-age}

GET endpoint for age

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Content-Range {#get-content-range}

GET endpoint for Content-Range

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET Content-Length {#get-content-length}

GET endpoint for Content-Length

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET CMCD {#get-cmcd}

GET endpoint for CMCD

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-gesture-receiver {#get-media-gesture-receiver}

GET endpoint for media-gesture-receiver

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-container {#get-media-container}

GET endpoint for media-container

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET #xywh {#get-xywh}

GET endpoint for #xywh

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-controller {#get-media-controller}

GET endpoint for media-controller

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-chrome-button {#get-media-chrome-button}

GET endpoint for media-chrome-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-airplay-button {#get-media-airplay-button}

GET endpoint for media-airplay-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-captions-button {#get-media-captions-button}

GET endpoint for media-captions-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-cast-button {#get-media-cast-button}

GET endpoint for media-cast-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-chrome-dialog {#get-media-chrome-dialog}

GET endpoint for media-chrome-dialog

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-chrome-range {#get-media-chrome-range}

GET endpoint for media-chrome-range

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-control-bar {#get-media-control-bar}

GET endpoint for media-control-bar

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-text-display {#get-media-text-display}

GET endpoint for media-text-display

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-duration-display {#get-media-duration-display}

GET endpoint for media-duration-display

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-fullscreen-button {#get-media-fullscreen-button}

GET endpoint for media-fullscreen-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-live-button {#get-media-live-button}

GET endpoint for media-live-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-loading-indicator {#get-media-loading-indicator}

GET endpoint for media-loading-indicator

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-mute-button {#get-media-mute-button}

GET endpoint for media-mute-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-pip-button {#get-media-pip-button}

GET endpoint for media-pip-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-playback-rate-button {#get-media-playback-rate-button}

GET endpoint for media-playback-rate-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-play-button {#get-media-play-button}

GET endpoint for media-play-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-poster-image {#get-media-poster-image}

GET endpoint for media-poster-image

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-preview-chapter-display {#get-media-preview-chapter-display}

GET endpoint for media-preview-chapter-display

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-preview-thumbnail {#get-media-preview-thumbnail}

GET endpoint for media-preview-thumbnail

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-preview-time-display {#get-media-preview-time-display}

GET endpoint for media-preview-time-display

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-seek-backward-button {#get-media-seek-backward-button}

GET endpoint for media-seek-backward-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-seek-forward-button {#get-media-seek-forward-button}

GET endpoint for media-seek-forward-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-time-display {#get-media-time-display}

GET endpoint for media-time-display

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-time-range {#get-media-time-range}

GET endpoint for media-time-range

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-tooltip {#get-media-tooltip}

GET endpoint for media-tooltip

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-volume-range {#get-media-volume-range}

GET endpoint for media-volume-range

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE muted {#delete-muted}

DELETE endpoint for muted

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET token {#get-token}

GET endpoint for token

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET token {#get-token}

GET endpoint for token

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET mux-video {#get-mux-video}

GET endpoint for mux-video

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-theme {#get-media-theme}

GET endpoint for media-theme

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-chrome-menu {#get-media-chrome-menu}

GET endpoint for media-chrome-menu

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-chrome-menu-item {#get-media-chrome-menu-item}

GET endpoint for media-chrome-menu-item

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-settings-menu {#get-media-settings-menu}

GET endpoint for media-settings-menu

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-settings-menu-item {#get-media-settings-menu-item}

GET endpoint for media-settings-menu-item

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-chrome-menu-button {#get-media-chrome-menu-button}

GET endpoint for media-chrome-menu-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-settings-menu-button {#get-media-settings-menu-button}

GET endpoint for media-settings-menu-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-audio-track-menu {#get-media-audio-track-menu}

GET endpoint for media-audio-track-menu

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-audio-track-menu-button {#get-media-audio-track-menu-button}

GET endpoint for media-audio-track-menu-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-captions-menu {#get-media-captions-menu}

GET endpoint for media-captions-menu

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-captions-menu-button {#get-media-captions-menu-button}

GET endpoint for media-captions-menu-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-playback-rate-menu {#get-media-playback-rate-menu}

GET endpoint for media-playback-rate-menu

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-playback-rate-menu-button {#get-media-playback-rate-menu-button}

GET endpoint for media-playback-rate-menu-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-rendition-menu {#get-media-rendition-menu}

GET endpoint for media-rendition-menu

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-rendition-menu-button {#get-media-rendition-menu-button}

GET endpoint for media-rendition-menu-button

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-dialog {#get-media-dialog}

GET endpoint for media-dialog

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET mxp-dialog {#get-mxp-dialog}

GET endpoint for mxp-dialog

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET media-theme-gerwig {#get-media-theme-gerwig}

GET endpoint for media-theme-gerwig

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET mux-player {#get-mux-player}

GET endpoint for mux-player

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET content-type {#get-content-type}

GET endpoint for content-type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET content-type {#get-content-type}

GET endpoint for content-type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /content-type-builder/schema {#get-content-type-builder-schema}

GET endpoint for /content-type-builder/schema

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /content-type-builder/reserved-names {#get-content-type-builder-reserved-names}

GET endpoint for /content-type-builder/reserved-names

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /content-type-builder/update-schema {#post-content-type-builder-update-schema}

POST endpoint for /content-type-builder/update-schema

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE  {#delete}

DELETE endpoint for 

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET logo-url {#get-logo-url}

GET endpoint for logo-url

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET content-type {#get-content-type}

GET endpoint for content-type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET mode {#get-mode}

GET endpoint for mode

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /manage {#get-manage}

GET endpoint for /manage

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /manage {#post-manage}

POST endpoint for /manage

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /create-checkout-session {#post-create-checkout-session}

POST endpoint for /create-checkout-session

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /webhook {#post-webhook}

POST endpoint for /webhook

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /usage {#get-usage}

GET endpoint for /usage

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /websites {#get-websites}

GET endpoint for /websites

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /websites {#post-websites}

POST endpoint for /websites

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /audit/:websiteId {#get-audit-websiteid}

GET endpoint for /audit/:websiteId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /crawl/:websiteId {#get-crawl-websiteid}

GET endpoint for /crawl/:websiteId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /issues/:websiteId {#get-issues-websiteid}

GET endpoint for /issues/:websiteId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET / {#get}

GET endpoint for /

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /detailed {#get-detailed}

GET endpoint for /detailed

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /ready {#get-ready}

GET endpoint for /ready

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /alive {#get-alive}

GET endpoint for /alive

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /connection {#get-connection}

GET endpoint for /connection

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /oauth/start {#get-oauth-start}

GET endpoint for /oauth/start

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /oauth/callback {#get-oauth-callback}

GET endpoint for /oauth/callback

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /oauth/refresh {#post-oauth-refresh}

POST endpoint for /oauth/refresh

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /properties {#get-properties}

GET endpoint for /properties

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /sync {#post-sync}

POST endpoint for /sync

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /performance {#get-performance}

GET endpoint for /performance

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /connections {#get-connections}

GET endpoint for /connections

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /connections {#post-connections}

POST endpoint for /connections

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /connections/:id {#get-connections-id}

GET endpoint for /connections/:id

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE /connections/:id {#delete-connections-id}

DELETE endpoint for /connections/:id

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /oauth/start {#get-oauth-start}

GET endpoint for /oauth/start

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /oauth/callback/:type {#get-oauth-callback-type}

GET endpoint for /oauth/callback/:type

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /test-connection {#post-test-connection}

POST endpoint for /test-connection

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /login {#post-login}

POST endpoint for /login

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /register {#post-register}

POST endpoint for /register

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /refresh {#post-refresh}

POST endpoint for /refresh

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /me {#get-me}

GET endpoint for /me

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET / {#get}

GET endpoint for /

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /generate {#post-generate}

POST endpoint for /generate

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### POST /publish {#post-publish}

POST endpoint for /publish

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET /:id {#get-id}

GET endpoint for /:id

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### PUT /:id {#put-id}

PUT endpoint for /:id

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### DELETE /:id {#delete-id}

DELETE endpoint for /:id

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET User-Agent {#get-user-agent}

GET endpoint for User-Agent

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET User-Agent {#get-user-agent}

GET endpoint for User-Agent

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET site_url {#get-site-url}

GET endpoint for site_url

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET user_login {#get-user-login}

GET endpoint for user_login

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET password {#get-password}

GET endpoint for password

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET shop {#get-shop}

GET endpoint for shop

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET websiteId {#get-websiteid}

GET endpoint for websiteId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET websiteUrl {#get-websiteurl}

GET endpoint for websiteUrl

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET status {#get-status}

GET endpoint for status

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET limit {#get-limit}

GET endpoint for limit

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET offset {#get-offset}

GET endpoint for offset

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET stripe-signature {#get-stripe-signature}

GET endpoint for stripe-signature

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET url {#get-url}

GET endpoint for url

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET siteUrl {#get-siteurl}

GET endpoint for siteUrl

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET authorization {#get-authorization}

GET endpoint for authorization

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET connectionId {#get-connectionid}

GET endpoint for connectionId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET siteId {#get-siteid}

GET endpoint for siteId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET threadId {#get-threadid}

GET endpoint for threadId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET authUserId {#get-authuserid}

GET endpoint for authUserId

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET userToken {#get-usertoken}

GET endpoint for userToken

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET code {#get-code}

GET endpoint for code

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET state {#get-state}

GET endpoint for state

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET error {#get-error}

GET endpoint for error

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET origin {#get-origin}

GET endpoint for origin

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET code {#get-code}

GET endpoint for code

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET state {#get-state}

GET endpoint for state

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET error {#get-error}

GET endpoint for error

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET user_id {#get-user-id}

GET endpoint for user_id

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET site_url {#get-site-url}

GET endpoint for site_url

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET user_login {#get-user-login}

GET endpoint for user_login

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---

### GET password {#get-password}

GET endpoint for password

**Service Function:** `handler`



**Parameters:**


**Response:** JSON response

**Error Handling:** Standard HTTP error codes

---
