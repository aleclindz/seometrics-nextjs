# Backend Documentation

# Backend API Documentation

This document provides a comprehensive overview of the backend API, including routes, functions, and their interactions with the database. It also includes mappings between UI components and API endpoints for better understanding and navigation.

## Table of Contents
- [1. Strapi Publishing Debug & Fix](#1-strapi-publishing-debug--fix)
- [2. Admin Tool API](#2-admin-tool-api)
- [3. Supabase Server Client](#3-supabase-server-client)
- [4. GSC Connection Component](#4-gsc-connection-component)
- [5. API Service](#5-api-service)
- [6. UI Component → API Mapping](#6-ui-component--api-mapping)

---

## 1. Strapi Publishing Debug & Fix

### Issues Identified & Fixed ✅

#### 1.1 CMS Manager Database Schema Mismatch
- **Problem**: The CMS Manager was using modern schema (`user_id`, `is_active`) while the database had a legacy schema (`user_token`, `status`).
- **Error**: `400 Bad Request` when querying the `cms_connections` table.
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
- **Error Message**: 
  ```
  "Method not allowed for endpoint: api::blog-post.blog-post"
  ```

---

## 2. Admin Tool API

### Routes
- **GET** `/api/health`
- **GET** `/api/websites`
- **GET** `/api/websites/:token`
- **POST** `/api/test-endpoints/:token`
- **POST** `/api/websites`
- **GET** `/api/users`
- **GET** `/api/env`
- **GET** `/`

### Functions
- **Health Check**: Returns the health status of the API.
- **Get Websites**: Retrieves all websites with associated user information.

### Example Route Implementation
```typescript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## 3. Supabase Server Client

### Functionality
- **Function**: `createServerSupabaseClient`
- **Purpose**: Creates a Supabase client for server-side rendering.
- **Parameters**: None.
- **Returns**: A Supabase client instance.

### Example Implementation
```typescript
export const createServerSupabaseClient = () => {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};
```

---

## 4. GSC Connection Component

### Routes
- **GET** `gsc_connected`
- **GET** `error`
- **GET** `details`

### Function
- **Function**: `GSCConnection(param)`
- **Purpose**: Manages the connection status with Google Search Console (GSC).

### Example Implementation
```typescript
export default function GSCConnection({ onConnectionChange }: GSCConnectionProps) {
  // Component logic here...
}
```

---

## 5. API Service

### Routes
- **GET** `/`

### Functions
- **Purpose**: Entry point for the API service, handling various routes through imported route files.

### Example Route Implementation
```typescript
const app = express();
app.use('/api/auth', authRoutes);
app.use('/api/gsc', gscRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/health', healthRoutes);
```

---

## 6. UI Component → API Mapping

| **Slug**          | **Service Function**       | **Linked Components** | **Purpose**                              | **Parameters**                      | **Response**                      | **Error Handling**                | **Database Operations**           |
|-------------------|----------------------------|-----------------------|------------------------------------------|------------------------------------|-----------------------------------|-----------------------------------|-----------------------------------|
| `get-health`      | `GET /api/health`         | -                     | Returns the health status of the API.   | None                               | `{ status: 'ok', timestamp: '...'}` | `500 Internal Server Error`       | None                              |
| `get-websites`    | `GET /api/websites`       | -                     | Retrieves all websites.                  | None                               | `[{ id: 1, name: 'Website 1' }]` | `404 Not Found`                   | Select from `websites`           |
| `post-websites`   | `POST /api/websites`      | -                     | Creates a new website.                   | `{ name: string, url: string }`   | `{ id: 1, name: 'Website 1' }`   | `400 Bad Request`                 | Insert into `websites`           |
| `gsc_connected`    | `GET gsc_connected`       | `GSCConnection`       | Checks GSC connection status.            | None                               | `{ connected: true, ... }`       | `401 Unauthorized`                 | None                              |

---

This documentation serves as a reference for developers to understand the backend API structure, its routes, and how they relate to the UI components. For further details on specific implementations, please refer to the respective code files.

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
