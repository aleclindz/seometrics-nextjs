Great. I’ll compile the necessary API documentation links and provide step-by-step instructions for building seamless OAuth or API key integrations with WordPress (self-hosted via REST API), Webflow CMS, and Shopify Blog API. This will include automated publishing capabilities and article retrieval without manual form setup.


# One-Click CMS Integrations for WordPress, Webflow, and Shopify

## WordPress (Self-Hosted via REST API)

* **API documentation:** WordPress’s REST API is documented on the official Developer Handbook (e.g. the reference for Posts). This includes endpoints under `/wp-json/wp/v2/` for posts, pages, etc.

* **Authentication method & flow:** Self-hosted WordPress uses basic authentication or token-based auth for its REST API. A common approach is **Application Passwords** (introduced in WordPress 5.6) which serve as API keys for a user. The user can generate an application password in their profile, and your integration can use it with HTTP Basic Auth (username and the 24-character app password) to authenticate REST requests. For a *1-click* style onboarding, WordPress provides an **OAuth-like flow** using the built-in Application Password authorization screen. Your app can redirect the user to `https://<site>/wp-admin/authorize-application.php?app_name=SEOAgent&success_url=<callback>&reject_url=<cancel>` . The user will log in (if not already) and approve, and WordPress will then redirect to your `success_url` with `site_url`, `user_login`, and `password` in the query string. The returned `password` is the new application password, which your app can capture and use for future API calls (the username is given by `user_login`). This eliminates manual copy-pasting. (If the WordPress site has **Jetpack** installed and connected to WordPress.com, you could alternatively use the WordPress.com OAuth2 flow, but the Application Password approach is native to WordPress core.)

* **Required token scopes or permissions:** WordPress’s REST API doesn’t use granular OAuth scopes. Access is determined by the user’s role and capabilities. The application password inherits the permissions of the user who created it. For example, a user with Author or Administrator role can create and edit posts via the API. Ensure the user you connect as has rights to read and write posts (e.g. an Author or above for blog posts). If using the WordPress.com/Jetpack OAuth method, you can request scopes like `posts` and `comments` (or omit `scope` to get full access to the blog).

* **SDKs or libraries:** You can interact with the WordPress REST API using standard HTTP libraries (e.g. `fetch` or `axios` in JavaScript, Python’s `requests`). There are also helper libraries and SDKs:

  * **JavaScript/Node:** The `wpapi` NPM package (WP REST API Node.js Client) simplifies calls by providing a wrapper for endpoints.
  * **Python:** Libraries like `wordpress-api-client` or `WPAPI` exist, or you can use `requests` with basic auth.
  * **PHP:** WordPress provides a built-in PHP REST API client for internal use, but external apps can use WP’s XML-RPC or third-party PHP packages if needed.
  * Additionally, WordPress supports command-line integration via WP-CLI (not OAuth, but useful for server-to-server scripts).

* **Example – Publish an Article (POST a blog post):** Use the `/wp-json/wp/v2/posts` endpoint. Authentication is via Basic Auth using the username and application password. For example, using `curl` you could run:

  ```bash
  curl -X POST "https://yourblog.com/wp-json/wp/v2/posts" \
       -u your_username:YOUR_APP_PASSWORD \
       -H "Content-Type: application/json" \
       -d '{
             "title": "My New Post",
             "content": "Hello, this is the post content.",
             "status": "publish"
           }'
  ```

  This will create and publish a new blog post. The JSON payload can include fields like `title`, `content` (HTML or text), `status` (`publish`, `draft`, etc.), and more (see WordPress REST API docs). On success, the API returns a JSON of the created post.

* **Example – Retrieve existing posts:** To fetch posts, you can call the GET endpoint for posts. For public posts, no auth is required (the REST API is read-open by default for published content). For example:

  ```bash
  curl -X GET "https://yourblog.com/wp-json/wp/v2/posts"
  ```

  This returns a JSON array of recent posts. You can add query parameters (e.g. `?per_page=20` or filters) as documented. If you need to retrieve private or draft posts, include authentication (e.g. using `-u user:app_password`) so that the request runs with a user context that has permission.

* **Programmatic OAuth onboarding:** If using the application password flow, your integration should:

  1. **Direct user to authorize:** Construct the WP Admin authorization URL with your app’s name and a secure callback URL. For example:

     ```
     https://example.com/wp-admin/authorize-application.php?app_name=SEOAgent&success_url=https://app.seoagent.com/wp-callback&app_id=<UUID>
     ```

     (Use a unique `app_id` UUID to identify your app instance, and ensure the site is HTTPS.)
  2. **User approves:** The user logs in (if needed) and clicks “Approve” on the WordPress authorize screen for your app.
  3. **Capture credentials:** WordPress redirects to your `success_url` with `site_url`, `user_login`, and `password` in the query string. Your integration should receive this request server-side (to avoid exposing the password in client-side code).
  4. **Store token & use API:** Store the `site_url` (the base URL of the WP site), username, and application password securely. Going forward, include these in the Authorization header for API calls (Basic auth). For example, when making requests you can base64-encode `user_login:password` and set `Authorization: Basic <encoded>`. Now your app can programmatically read or publish posts on the user’s site without further input.

  *Alternative:* With Jetpack-enabled sites, you could register a WordPress.com OAuth app and perform the OAuth2 flow against WordPress.com’s endpoints (user is redirected to WordPress.com, approves access to their Jetpack-connected site, and you get an API token). The token is then used with the WordPress.com REST API (endpoints like `https://public-api.wordpress.com/rest/v1/sites/<site_id>/posts/…`). This also achieves 1-click auth, though it requires the site to have Jetpack. The recommended approach for a self-hosted site integration without plugins is the Application Password flow described above, as it’s built-in and straightforward.

## Webflow CMS

* **API documentation:** Webflow provides a RESTful **Data API** for CMS content. The official documentation covers CMS endpoints for collections and items and guides (e.g. *“Working with the CMS”* guide) on using the API. The base URL is `https://api.webflow.com/v2/` for the newest version (v2) of the API.

* **Authentication method & flow:** Webflow supports two methods of auth: **Site API Tokens** and **OAuth 2.0**. For a seamless 1-click integration, OAuth is preferred. You (the developer) must create a **Webflow App** (of type “Data Client”) in Webflow’s Developer platform, which gives you a `client_id` and `client_secret`.

  * **OAuth flow:** Redirect the user to Webflow’s authorization URL (`https://webflow.com/oauth/authorize`) with your `client_id`, requested scopes, and a `redirect_uri` for after approval. For example:

    ```
    https://webflow.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://yourapp.com/callback&scope=cms:read%20cms:write%20sites:read
    ```

    The user will log in to Webflow and authorize your app, granting access to specific site(s) and scopes. Webflow then redirects to your callback URL with a `code`. Your server exchanges this code for an access token by making a POST to Webflow’s token endpoint (`https://api.webflow.com/oauth/access_token`) with your client\_id, client\_secret, redirect\_uri, and the code. If valid, it returns a Bearer access token (and a refresh token if applicable). This token is used in the `Authorization: Bearer ...` header for API calls. The token represents the authorized Webflow user and whatever site(s) they approved.
  * **API Key method:** Alternatively, the user can generate a permanent **Site API token** in their Webflow Project Settings (under “Integrations”). This token is essentially a personal API key tied to one site. Your integration could ask the user to copy-paste this token. However, this is manual and not “1-click”. (If a user does provide a Site API token, use it as the Bearer token in API calls. No OAuth handshake needed.)
  * In summary, for a one-click experience, implement the OAuth flow. Once the user authorizes, you get a token and can immediately call the Webflow CMS API on their behalf.

* **Required token scopes or permissions:** In Webflow’s OAuth, you must request the appropriate **scopes** for the actions your app needs. For reading and writing CMS content, the key scopes are:

  * `sites:read` – to list or read site info (often needed to get a Site ID).
  * `cms:read` and `cms:write` – to read from and write to Collections (CMS items).
  * If you will update other entities (like images/assets or publish the site), there are scopes like `assets:write` or `sites:write` (for publishing) etc., but for simply managing blog posts, `cms:read` and `cms:write` are sufficient. Only request the minimum scopes needed.
  * For a Site API token (manual method), the token inherently has the scopes chosen when it was generated (Webflow lets the user pick read/write permissions for CMS, forms, etc. during token creation).

* **SDKs or libraries:** Webflow offers an official **JavaScript SDK** (`webflow-api` on npm) that can handle OAuth and API calls in Node/JS. For example, you can initialize `new WebflowClient({ token: '...' })` and use methods like `client.collections.items.listItems(siteId, collectionId)`. There is also a **Webflow CLI** and example apps provided by Webflow. In Python, Webflow provides an SDK as well (via their `webflow-api` Python package). These libraries simplify authentication and forming requests. Alternatively, you can use any HTTP client: just include the `Authorization: Bearer <token>` header and necessary JSON. The API returns JSON responses.

* **Example – Publish an Article (create a CMS item):** In Webflow, “Blog posts” would typically be items in a **Collection** (e.g. a Collection named "Blog Posts"). To create a new item, you need the Collection ID (and the Site ID if using certain endpoints). Use the endpoint `POST /collections/{collection_id}/items`. Include the required fields for that collection. For example, if each blog post has a **Name** field and maybe a **Rich Text** field for content, those go in the payload. An example using `curl`:

  ```bash
  curl -X POST "https://api.webflow.com/v2/collections/{$COLLECTION_ID}/items" \
       -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
             "isDraft": false,
             "isArchived": false,
             "fieldData": {
               "name": "Example Post Title",
               "slug": "example-post-title",
               "postContent": "This is the body of the blog post."
             }
           }'
  ```

  In this JSON, `fieldData` keys must match the field keys in Webflow (e.g. `"name"` is usually the Title field, and here `"postContent"` is an imaginary field key for the post body – use your collection’s actual field keys). Setting `"isDraft": false` and `"isArchived": false` means the item is created as a normal item (not archived, not a draft). The API will return a `201 Created` with the item’s data (including its new `id`) if successful. *Note:* Creating an item does not automatically publish it to the live site. In Webflow, after creating or updating CMS items via API, you typically call the **Publish Site** endpoint to publish those changes live (or set the `live` parameter on older API version calls). In Webflow API v2, collection items are created in draft stage by default until you publish the site or use the “Publish Site” API to push drafts live. Ensure to publish if you want the content visible on the live website.

* **Example – Retrieve existing blog posts:** To fetch items from a collection, use `GET /collections/{collection_id}/items`. For example:

  ```bash
  curl -X GET "https://api.webflow.com/v2/collections/{$COLLECTION_ID}/items" \
       -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
       -H "accept: application/json"
  ```

  This returns a JSON object containing an array of `items`. Each item represents a blog post with its fields. Ensure your token has `cms:read` scope for this. You might first need to use `GET /sites` (requires `sites:read`) to find the site and collection IDs if you don’t have them stored. Webflow’s API uses IDs for sites, collections, and items, which your integration should store or retrieve as needed. (The Webflow SDK can abstract some of this, e.g. listing collections by site.)

* **Programmatic OAuth onboarding:** To implement the OAuth flow in your integration:

  1. **Register App & Scopes:** In your Webflow Developer Dashboard, register a new **Data Client** app. Define the scopes your app needs (e.g. `cms:read`, `cms:write`, `sites:read`) and set your OAuth callback URL.
  2. **Authorization URL:** When the user chooses to connect their Webflow account, redirect them to the Webflow authorization URL. Include query params `client_id`, `response_type=code`, `state` (a random CSRF token), `scope` (space-separated scopes), and `redirect_uri`. For example:

     `https://webflow.com/oauth/authorize?client_id=XYZ&response_type=code&scope=cms:write%20cms:read%20sites:read&state=12345&redirect_uri=https://yourapp.com/webflow-callback`

     The user will see a consent screen listing the permissions (scopes) your app wants. They may be asked to choose which site to grant access to, unless you specify a particular `site` in the request.
  3. **Callback handling:** Webflow will redirect to your `redirect_uri` with parameters `code` and `state` (and possibly `site_id` if the user had to select a site). Verify the `state` matches what you sent.
  4. **Token request:** Your server makes a `POST` request to `https://api.webflow.com/oauth/access_token`  with `client_id`, `client_secret`, `code`, and `grant_type=authorization_code` (and include `redirect_uri` if it was included in the auth request). If all is good, Webflow responds with a JSON containing an `access_token` (and a `refresh_token` if offline access).
  5. **Store token:** Save the access token securely (it may be long-lived for the authorized site, as Webflow tokens do not expire quickly for Data API).
  6. **Use the API:** For all subsequent Webflow API calls, include `Authorization: Bearer <token>`. For instance, to create or fetch items as shown above. Your app now can read/write the user’s Webflow CMS content without further input. (Keep in mind API rate limits and handle token refresh if using short-lived tokens; Webflow’s API docs detail these under authentication guides.)

  If instead you use a manual Site API token, the onboarding is simpler (no redirects): just have the user paste their token into your app. However, this is not one-click. OAuth is the recommended seamless path – it’s more secure (the user grants limited scopes rather than sharing a master token) and can span multiple sites if needed.

## Shopify (Blog API via Admin REST)

* **API documentation:** Shopify’s Admin API covers blogs and articles (blog posts) under the “Content” category. The **Article** resource is documented in the REST Admin API reference. (Each Shopify store can have multiple Blogs, and each Blog contains Articles – which are the individual blog posts.) The docs outline endpoints like `/admin/api/<version>/blogs/{blog_id}/articles.json` for articles. *Note:* As of 2024, Shopify encourages use of their GraphQL API for new apps, but the REST API is still fully supported. We will focus on REST for clarity.

* **Authentication method & flow:** Shopify uses OAuth 2.0 for apps to access a store’s Admin API. To integrate SEOAgent with a Shopify store in one click, you would create a **public Shopify App** (or a custom app for a single client) and implement the OAuth authorization code grant flow.

  * **OAuth flow:** You must have an app API Key (client\_id) and API Secret (client\_secret) from the Shopify Partners dashboard (where you create the app). When a user wants to connect their store, you redirect them to the Shopify authorization URL:

    ```
    https://{storename}.myshopify.com/admin/oauth/authorize?client_id={API_KEY}&scope=read_content,write_content&redirect_uri={your_redirect_url}&state={nonce}
    ```

    Here, `{storename}.myshopify.com` is the shop’s domain, and you request the scopes your app needs. For blogging, the scopes needed are **“Content”** scopes – specifically `read_content` and `write_content` – which cover Articles (blog posts), Blogs, Pages and Comments. (These scopes allow creating and reading articles on the store’s blogs.) The user will be prompted to install the app and grant those permissions, seeing a screen listing “Manage blog posts, comments, and pages” if those scopes are requested.
  * After approval, Shopify redirects the user to your `redirect_uri` with a temporary `code`, the `shop` domain, and a `state`. **Security check:** your app should verify the `state` and the accompanying `hmac` parameter to ensure the request is from Shopify (HMAC is a signature you compute using your app secret).
  * **Access token request:** Next, your server sends a POST to Shopify to exchange the code for a permanent token:

    ```
    POST https://{storename}.myshopify.com/admin/oauth/access_token 
    Content-Type: application/json
    {
      "client_id": "{API_KEY}",
      "client_secret": "{API_SECRET}",
      "code": "{code-from-query}"
    }
    ```

    Shopify will respond with a JSON containing an `access_token`. This token is what you use to authenticate API calls.
  * **Authenticated calls:** Store the token. For all subsequent REST API requests to that shop, include the header `X-Shopify-Access-Token: {token}`. There is no refresh token; the token is valid until the merchant uninstalls the app or revokes access. (Shopify tokens for offline access do not expire.)
  * This OAuth flow is typically initiated by the user clicking “Connect Shopify Store” in your app, and the process is completed in a few redirects – no manual key entry. If building a private/custom app for a single store, Shopify also allows generating an Admin API access token in the store’s admin without OAuth, but that requires manual setup by the store owner and doesn’t scale. The OAuth approach is the one-click experience for public apps.

* **Required token scopes or permissions:** For blog content, your app needs the **Content** API scopes. Shopify’s REST API scopes are documented; relevant ones are:

  * `read_content` – allows GET/read access to Articles, Blogs, Pages, and Comments.
  * `write_content` – allows POST/PUT/DELETE access to create or modify those resources.
  * These two scopes cover everything needed to fetch and publish blog posts on a store. (If you also plan to manage comments on blog posts via API, those are included in content scopes as well, since Comments are listed under content.) When you register your app in Shopify, you must request these scopes. During installation, the merchant will see these as the permissions the app is requesting.
  * *Note:* If using GraphQL Admin API, the equivalent permission is `content` (since GraphQL uses more unified scope names), but for REST the above are correct. Also ensure your app is configured as “Public” or “Custom” with access to the Admin API (with the scopes set in the app config).

* **SDKs or libraries:** Shopify provides official API libraries that handle much of the OAuth and API calling process:

  * **Shopify API for Node.js (`@shopify/shopify-api`)** – A robust library that can set up OAuth (it can generate the auth URL, verify HMAC, and exchange tokens) and provides REST and GraphQL clients. For example, using the Node library you can do `client = new Shopify.Clients.Rest(shop, accessToken)` and then `client.get({ path: 'blogs/123456789/articles' })` instead of manual HTTP calls.
  * **Shopify API for Ruby (shopify\_api gem)** – Similar capabilities for Ruby apps.
  * **Others:** Shopify also has official libraries for Python (`shopifyapi` via pyactiveresource) and PHP, as well as community libraries. Using these libraries can save time, as they include helpers for OAuth, making API calls, and following Shopify’s API versioning. They also help with **rate limiting** considerations (Shopify allows 40 REST calls per store per minute for regular stores).
  * If not using an SDK, you can use any HTTP client to call Shopify’s REST endpoints. Just remember to include the `X-Shopify-Access-Token` and set the `Content-Type: application/json` for writes. The endpoints are versioned (e.g. `/2024-10/` in the URL) – you should pick a stable API version for your app and include it in the URL.

* **Example – Publish an Article (create a blog post):** To create a new blog post in Shopify via REST, you’ll use the **Article** API. First, you need the Blog ID where you want to publish (you can retrieve blogs with `GET /admin/api/<version>/blogs.json` – typically there’s a default "Blog" on every store). Then POST a new article to that blog’s articles endpoint. For example, with `curl`:

  ```bash
  curl -X POST "https://{store}.myshopify.com/admin/api/2024-10/blogs/{$BLOG_ID}/articles.json" \
       -H "X-Shopify-Access-Token: $ACCESS_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
             "article": {
               "title": "New Post from SEOAgent",
               "body_html": "<p>This is the content of the blog post.</p>",
               "published_at": "2025-07-24T14:20:00Z"
             }
           }'
  ```

  In this JSON, the top-level key is `"article"` as required by Shopify’s API. We include a `title`, the HTML content (`body_html`), and an optional `published_at` timestamp. By setting `published_at` to a current timestamp (in ISO8601 format), we mark the post as published immediately. (If you omit `published_at`, the article will be saved as an unpublished draft – you can later publish it by updating `published_at` or via the Shopify Admin.) The API will respond with the created article JSON, including its `id` and other details.

  Shopify’s Article API also supports additional fields like `author` (defaults to the API user or shop owner), `tags` (comma-separated), etc., which you can include in the `article` object. For example, you could add `"tags": "SEO, Integrations"` or `"author": "Jane Doe"`. See the Article resource properties in the docs for all available fields.

* **Example – Retrieve existing blog posts:** To fetch articles from a blog, use the GET endpoint for that blog’s articles. For example:

  ```bash
  curl -X GET "https://{store}.myshopify.com/admin/api/2024-10/blogs/{$BLOG_ID}/articles.json?limit=10" \
       -H "X-Shopify-Access-Token: $ACCESS_TOKEN"
  ```

  This will return a JSON with an `"articles"` array containing up to 10 articles from the specified blog. You can paginate through articles using parameters like `since_id` or using cursor-based pagination via the Link header (Shopify’s REST API paginates results). Each Article object includes fields like `id`, `title`, `body_html`, `created_at`, `updated_at`, `published_at`, `tags`, etc.. If you need a specific article, you can GET `/blogs/{$BlogID}/articles/{$ArticleID}.json`. The API will only return articles that the token’s scopes allow – with `read_content` you’ll get both published and unpublished articles. (If an article is a draft, its `published_at` will be null.) Ensure you handle the case where no articles or the blog ID is wrong – the API would return an error or empty result.

* **Programmatic OAuth onboarding:** To integrate the Shopify OAuth flow programmatically in SEOAgent:

  1. **App registration:** Create your app in the Shopify Partner Dashboard. Set the app’s **App URL** (where Shopify redirects after install) and **Redirect URLs** to your server endpoints (e.g. `https://yourapp.com/shopify/callback`). Define the scopes `read_content, write_content` in the app settings.
  2. **Initiate OAuth:** When the user chooses to connect a Shopify store, have them enter their shop’s `.myshopify.com` domain (or use Shopify App Bridge if embedded). Your backend then creates the Shopify authorize URL (as shown above) and redirects the user. For example:

     ```http
     https://example-shop.myshopify.com/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=read_content,write_content&redirect_uri=https://yourapp.com/shopify/callback&state=nonce123
     ```

     Optionally include `&grant_options[]=per-user` if you need an online token (usually not needed for content management apps; offline tokens are default and fine for background operations).
  3. **Shopify Grant Screen:** The merchant logs in (if not already) and sees the installation prompt describing your app’s requested permissions. They click “Install app” to authorize.
  4. **Callback validation:** Shopify sends a GET request to your callback URL with `code`, `shop`, `state`, `hmac`, and `timestamp`. Your app must **verify the HMAC** using the query parameters (except hmac) and your app secret to ensure the request wasn’t tampered with. Also verify the `state` matches what you sent (to prevent CSRF).
  5. **Exchange code for token:** If the checks pass, make the POST request to `/admin/oauth/access_token` on the shop’s domain as described. In response, you’ll get the JSON `{ "access_token": "shpua_xxx", "scope": "read_content,write_content", ... }`. Store this `access_token` in your database, associated with the shop’s domain.
  6. **Use token for API calls:** Now your app can make authorized calls to Shopify’s Admin API. Include `X-Shopify-Access-Token: {token}` in the header of each request. For example, you can immediately call the Article API to fetch a sample post or create a new one as a test. (It’s good practice to perform a test API call, like getting the shop’s information via `/admin/api/version/shop.json`, to confirm the token is working.)
  7. **Post-install:** The process is complete – no manual input from the user beyond the initial click and approval. On subsequent visits, you likely won’t repeat the OAuth flow unless the app is uninstalled or you need additional scopes. Your app should also handle **uninstalled** webhooks from Shopify to know when a merchant removes the app and then discard the token.

  Shopify’s API infrastructure handles a lot, but be mindful of a few things: **API versioning** – use a stable version in your URLs (e.g. `2024-10`) and update your app periodically to support newer versions. Also, **rate limits** – the content API is not high-volume, but if you bulk publish many posts, watch the 40 req/min limit (you might enqueue or throttle calls; the response headers will show usage). The official libraries have utilities for these concerns.

By implementing the above for each platform, SEOAgent can seamlessly connect to a user's CMS with minimal effort from them – they just click “Connect” and authorize, and then your app can programmatically read their existing posts and publish new SEO-optimized articles directly to their site.

**Sources:**

* WordPress REST API Reference – Posts; WordPress Application Passwords OAuth flow; WordPress.com OAuth2 docs.
* Webflow Developer Docs – CMS API and OAuth Guide.
* Shopify API Docs – Access Scopes and Article Resource.
