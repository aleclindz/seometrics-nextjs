# Backend Documentation

# Backend API Documentation

This documentation provides a comprehensive overview of the backend API, including routes, functions, and their corresponding UI components. Each API endpoint is detailed with its purpose, parameters, response structure, error handling, and database operations.

## Table of Contents
- [1. Strapi Publishing Debug & Fix](#strapi-publishing-debug--fix)
- [2. Admin Tool API](#admin-tool-api)
- [3. Supabase Server Client](#supabase-server-client)
- [4. GSC Connection Component](#gsc-connection-component)
- [5. API Service](#api-service)
- [6. UI Component → API Mapping](#ui-component--api-mapping)

---

## 1. Strapi Publishing Debug & Fix

### Issues Identified & Fixed
- **CMS Manager Database Schema Mismatch**
  - **Error**: `400 Bad Request` when querying `cms_connections` table.
  - **Fix**: Updated column mappings in `/src/lib/cms/cms-manager.ts`.
  
- **Created Supabase Edge Function**
  - **File**: `/supabase/functions/publish-article/index.ts`
  - **Purpose**: Replace Vercel Edge Functions with Supabase Edge Functions.

### Current Strapi Publishing Error Analysis
- **Error Message**: `"Method not allowed for endpoint: api::blog-post.blog-post"`

---

## 2. Admin Tool API

### Routes
- **GET /api/health**
  - **Purpose**: Check the health status of the API.
  - **Response**: `{ status: 'ok', timestamp: '2023-10-01T12:00:00Z' }`

- **GET /api/websites**
  - **Purpose**: Retrieve all websites.
  - **Response**: List of websites with associated users.

- **GET /api/websites/:token**
  - **Purpose**: Retrieve a specific website by token.
  - **Parameters**: `token` (string) - Unique identifier for the website.

- **POST /api/websites**
  - **Purpose**: Create a new website.
  - **Request Body**: `{ name: string, url: string }`
  - **Response**: Newly created website object.

### Error Handling
- **Error Codes**: 
  - `404 Not Found`: When a website with the specified token does not exist.
  - `400 Bad Request`: When the request body is invalid.

---

## 3. Supabase Server Client

### Function
- **createServerSupabaseClient**
  - **Purpose**: Create a Supabase client instance for server-side operations.
  - **Parameters**: None.
  - **Returns**: Supabase client instance.

### Usage
- This function is used to interact with the Supabase database in server-side rendering contexts.

---

## 4. GSC Connection Component

### Routes
- **GET gsc_connected**
  - **Purpose**: Check if the connection to Google Search Console (GSC) is established.
  
- **GET error**
  - **Purpose**: Retrieve any connection errors.

- **GET details**
  - **Purpose**: Fetch connection details.

### Component
- **GSCConnection**
  - **Props**: 
    - `onConnectionChange?: (connected: boolean) => void`
  - **State**: 
    - `connectionStatus`, `properties`, `loading`, `connecting`, `syncing`, `error`.

### Error Handling
- Handles connection errors and updates the UI accordingly.

---

## 5. API Service

### Routes
- **GET /** (Root)
  - **Purpose**: Entry point for the API service.

### Middleware
- **Security Middleware**: Uses `helmet` for security enhancements.
- **CORS Configuration**: Allows requests from specified origins.

### Error Handling
- Centralized error handling through middleware.

---

## 6. UI Component → API Mapping

| Slug             | Service Function             | Linked Components | Purpose                                    | Parameters                            | Response Structure                       | Error Handling                     | Database Operations                     |
|------------------|------------------------------|-------------------|--------------------------------------------|---------------------------------------|-----------------------------------------|-------------------------------------|-----------------------------------------|
| `get-health`     | `app.get('/api/health')`    | N/A               | Check API health status                    | N/A                                   | `{ status: 'ok', timestamp: string }`  | `500 Internal Server Error`        | N/A                                     |
| `get-websites`   | `app.get('/api/websites')`  | N/A               | Retrieve all websites                      | N/A                                   | Array of website objects                | `404 Not Found`, `400 Bad Request` | Read from `websites` table             |
| `post-websites`  | `app.post('/api/websites')` | N/A               | Create a new website                       | `{ name: string, url: string }`      | Newly created website object            | `400 Bad Request`                   | Insert into `websites` table           |
| `gsc-connected`   | `GET gsc_connected`          | `GSCConnection`    | Check GSC connection status                | N/A                                   | `{ connected: boolean, connection: object }` | `404 Not Found`                     | N/A                                     |

---

This documentation serves as a guide for developers to understand the API structure, endpoints, and their interactions with the UI components. For further details on specific functions or components, please refer to the respective sections above.

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
