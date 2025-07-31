# Frontend Documentation

# Frontend Features & Functionality

This React application provides a comprehensive user interface with 23 distinct pages and interactive components.

## Pages Overview

### Upgrade Badge
**Route**: `/unknown`

The Upgrade Badge page provides user interface and functionality for upgrade badge related features.

**Interactive Components**: 1
- ⚡

### Protected Route
**Route**: `/unknown`

The Protected Route page provides user interface and functionality for protected route related features.

**Interactive Components**: 2

### Feature Gate
**Route**: `/unknown`

The Feature Gate page provides user interface and functionality for feature gate related features.

**Interactive Components**: 4
- ⚡ Upgrade Now, ← Back to Dashboard

### App
**Route**: `/`

The App page provides user interface and functionality for app related features.

**Interactive Components**: 5

### Layout
**Route**: `/layout.tsx`

The Layout page provides user interface and functionality for layout related features.

**Interactive Components**: 5

### Terms
**Route**: `/terms`

The Terms page provides user interface and functionality for terms related features.

**Interactive Components**: 6
- legal@seoagent.com

### Strategy
**Route**: `/strategy`

The Strategy page provides user interface and functionality for strategy related features.

**Interactive Components**: 14
- input, Join Waitlist

### Privacy
**Route**: `/privacy`

The Privacy page provides user interface and functionality for privacy related features.

**Interactive Components**: 6
- privacy@seoagent.com

### Login
**Route**: `/login`

The Login page provides user interface and functionality for login related features.

**Interactive Components**: 13
- form, input, input, button, button, LoginForm

### Keywords
**Route**: `/keywords`

The Keywords page provides user interface and functionality for keywords related features.

**Interactive Components**: 7

### Debug Seo
**Route**: `/debug-seo`

The Debug Seo page provides user interface and functionality for debug seo related features.

**Interactive Components**: 17
- Back to Dashboard, Run All Tests, Run

### Dashboard
**Route**: `/dashboard`

The Dashboard page provides user interface and functionality for dashboard related features.

**Interactive Components**: 2

### Content Writer
**Route**: `/content-writer`

The Content Writer page provides user interface and functionality for content writer related features.

**Interactive Components**: 57
- button, Set Up CMS Connection, Create New Article, form, input, select, select, input, Cancel, button, select, button, button, button, View Live Article, Edit in Strapi, button

### Cms Connections
**Route**: `/cms-connections`

The Cms Connections page provides user interface and functionality for cms connections related features.

**Interactive Components**: 19
- Connect CMS, Cancel, Try Again, Get Started

### Chat
**Route**: `/chat`

The Chat page provides user interface and functionality for chat related features.

**Interactive Components**: 2

### Autopilot
**Route**: `/autopilot`

The Autopilot page provides user interface and functionality for autopilot related features.

**Interactive Components**: 11
- Get Tracking Script

### Article Writer
**Route**: `/article-writer`

The Article Writer page provides user interface and functionality for article writer related features.

**Interactive Components**: 57
- button, Set Up CMS Connection, Create New Article, form, input, select, select, input, Cancel, button, select, button, button, button, View Live Article, Edit in Strapi, button

### Add Website
**Route**: `/add-website`

The Add Website page provides user interface and functionality for add website related features.

**Interactive Components**: 29
- textarea, Copy Code, Done, form, input, select, input, input, Cancel, button

### Account
**Route**: `/account`

The Account page provides user interface and functionality for account related features.

**Interactive Components**: 15
- input, input, input, Sign Out

### [website Id]
**Route**: `/website/[websiteId]`

The [website Id] page provides user interface and functionality for [website id] related features.

**Interactive Components**: 40
- Return to Dashboard, Dashboard, button, button

### [token]
**Route**: `/meta-tags/[token]`

The [token] page provides user interface and functionality for [token] related features.

**Interactive Components**: 39
- Back to Dashboard, a, Edit, Delete

### [token]
**Route**: `/alt-tags/[token]`

The [token] page provides user interface and functionality for [token] related features.

**Interactive Components**: 40
- Back to Dashboard, a, Edit, Delete

### Cms Connection
**Route**: `/website/[websiteId]/cms-connection`

The Cms Connection page provides user interface and functionality for cms connection related features.

**Interactive Components**: 27
- Return to Dashboard, Dashboard, button, Disconnect

## Navigation Flow

The application provides seamless navigation between pages through:

- **Back to Dashboard** navigates from [debug-seo](#debug-seo) to [app](#app)
- **Set Up CMS Connection** navigates from [content-writer](#content-writer) to [cms-connections](#cms-connections)
- **Set Up CMS Connection** navigates from [article-writer](#article-writer) to [cms-connections](#cms-connections)
- **Done** navigates from [add-website](#add-website) to [app](#app)
- **Back to Dashboard** navigates from [token](#token) to [app](#app)
- **Back to Dashboard** navigates from [token](#token) to [app](#app)



---

## Technical Architecture

# Frontend Architecture Overview

This React application consists of **23 pages** with **418 components** (85 interactive).

## Pages Structure

- **[Upgrade Badge](#upgrade-badge)** (`/unknown`) - 1 components
- **[Protected Route](#protected-route)** (`/unknown`) - 2 components
- **[Feature Gate](#feature-gate)** (`/unknown`) - 4 components
- **[App](#app)** (`/`) - 5 components
- **[Layout](#layout)** (`/layout.tsx`) - 5 components
- **[Terms](#terms)** (`/terms`) - 6 components
- **[Strategy](#strategy)** (`/strategy`) - 14 components
- **[Privacy](#privacy)** (`/privacy`) - 6 components
- **[Login](#login)** (`/login`) - 13 components
- **[Keywords](#keywords)** (`/keywords`) - 7 components
- **[Debug Seo](#debug-seo)** (`/debug-seo`) - 17 components
- **[Dashboard](#dashboard)** (`/dashboard`) - 2 components
- **[Content Writer](#content-writer)** (`/content-writer`) - 57 components
- **[Cms Connections](#cms-connections)** (`/cms-connections`) - 19 components
- **[Chat](#chat)** (`/chat`) - 2 components
- **[Autopilot](#autopilot)** (`/autopilot`) - 11 components
- **[Article Writer](#article-writer)** (`/article-writer`) - 57 components
- **[Add Website](#add-website)** (`/add-website`) - 29 components
- **[Account](#account)** (`/account`) - 15 components
- **[[website Id]](#website-id)** (`/website/[websiteId]`) - 40 components
- **[[token]](#token)** (`/meta-tags/[token]`) - 39 components
- **[[token]](#token)** (`/alt-tags/[token]`) - 40 components
- **[Cms Connection](#cms-connection)** (`/website/[websiteId]/cms-connection`) - 27 components

## Component Distribution

- **Other Components**: 331
- **Buttons & Actions**: 45
- **Input Fields**: 21
- **Navigation Links**: 14
- **Forms & Input**: 5
- **Navigation Components**: 2

## Navigation Flow

The application uses a combination of:
- **Direct links** for page-to-page navigation
- **Button clicks** for actions and form submissions
- **Programmatic navigation** using React Router or Next.js routing

Click on any page below to see its components and navigation details.

## Components

### button {#button}

Interactive button labeled "⚡" that triggers user actions

**Props:** onClick: expression, className: expression, title: expression

**Usage:** Used in Upgrade Badge page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks ⚡


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Protected Route page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Protected Route page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Feature Gate page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Feature Gate page



### button {#button}

Interactive button labeled "⚡ Upgrade Now" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Feature Gate page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks ⚡ Upgrade Now


### button {#button}

Interactive button labeled "← Back to Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Feature Gate page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks ← Back to Dashboard


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in App page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in App page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in App page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in App page



### LandingPage {#landingpage}

LandingPage component

**Props:** 

**Usage:** Used in App page



### html {#html}

html component

**Props:** lang: string

**Usage:** Used in Layout page



### body {#body}

body component

**Props:** className: string

**Usage:** Used in Layout page



### AuthProvider {#authprovider}

AuthProvider component

**Props:** 

**Usage:** Used in Layout page



### Script {#script}

Script component

**Props:** src: string, strategy: string

**Usage:** Used in Layout page



### Script {#script}

Script component

**Props:** id: string, strategy: string

**Usage:** Used in Layout page



### ul {#ul}

ul component

**Props:** 

**Usage:** Used in Terms page



### li {#li}

li component labeled "Use the service for any unlawful purpose or to solicit unlawful activity"

**Props:** 

**Usage:** Used in Terms page



### li {#li}

li component labeled "Attempt to gain unauthorized access to our systems"

**Props:** 

**Usage:** Used in Terms page



### li {#li}

li component labeled "Interfere with or disrupt the service or servers"

**Props:** 

**Usage:** Used in Terms page



### li {#li}

li component labeled "Use the service to spam or send unsolicited messages"

**Props:** 

**Usage:** Used in Terms page



### a {#a}

Navigation link labeled "legal@seoagent.com" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Terms page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Strategy page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Strategy page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Strategy page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Strategy page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Strategy page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Strategy page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Strategy page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Strategy page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Strategy page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Strategy page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Strategy page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Strategy page



### input {#input}

Input field for user data entry

**Props:** type: string, placeholder: string, className: string

**Usage:** Used in Strategy page



### button {#button}

Interactive button labeled "Join Waitlist" that triggers user actions

**Props:** className: string

**Usage:** Used in Strategy page



### ul {#ul}

ul component

**Props:** 

**Usage:** Used in Privacy page



### li {#li}

li component labeled "Provide, maintain, and improve our SEO automation services"

**Props:** 

**Usage:** Used in Privacy page



### li {#li}

li component labeled "Process transactions and send related information"

**Props:** 

**Usage:** Used in Privacy page



### li {#li}

li component labeled "Send technical notices and support messages"

**Props:** 

**Usage:** Used in Privacy page



### li {#li}

li component labeled "Respond to your comments and questions"

**Props:** 

**Usage:** Used in Privacy page



### a {#a}

Navigation link labeled "privacy@seoagent.com" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Privacy page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Login page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Login page



### form {#form}

Form component for user input and data submission

**Props:** className: string, onSubmit: expression

**Usage:** Used in Login page



### label {#label}

label component labeled "Email address"

**Props:** htmlFor: string, className: string

**Usage:** Used in Login page



### input {#input}

Input field for user data entry

**Props:** id: string, name: string, type: string, autoComplete: string, required: unknown, value: expression, onChange: expression, className: string

**Usage:** Used in Login page



### label {#label}

label component labeled "Password"

**Props:** htmlFor: string, className: string

**Usage:** Used in Login page



### input {#input}

Input field for user data entry

**Props:** id: string, name: string, type: string, autoComplete: expression, required: unknown, value: expression, onChange: expression, className: string

**Usage:** Used in Login page



### button {#button}

Interactive button that triggers user actions

**Props:** type: string, disabled: expression, className: string

**Usage:** Used in Login page



### button {#button}

Interactive button that triggers user actions

**Props:** type: string, onClick: expression, className: string

**Usage:** Used in Login page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### Suspense {#suspense}

Suspense component

**Props:** fallback: expression

**Usage:** Used in Login page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Login page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Login page



### LoginForm {#loginform}

Form component for user input and data submission

**Props:** 

**Usage:** Used in Login page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Keywords page



### FeatureGate {#featuregate}

FeatureGate component

**Props:** feature: string

**Usage:** Used in Keywords page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Keywords page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Keywords page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Keywords page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Keywords page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Keywords page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Debug Seo page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Debug Seo page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Debug Seo page



### a {#a}

Navigation link labeled "Back to Dashboard" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Debug Seo page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Debug Seo page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Debug Seo page



### button {#button}

Interactive button labeled "Run All Tests" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Debug Seo page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Run All Tests


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Debug Seo page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Debug Seo page



### label {#label}

label component labeled "Website Token"

**Props:** className: string

**Usage:** Used in Debug Seo page



### label {#label}

label component labeled "Current URL"

**Props:** className: string

**Usage:** Used in Debug Seo page



### label {#label}

label component labeled "Images Found"

**Props:** className: string

**Usage:** Used in Debug Seo page



### label {#label}

label component labeled "Current Meta Title"

**Props:** className: string

**Usage:** Used in Debug Seo page



### header {#header}

header component

**Props:** className: string

**Usage:** Used in Debug Seo page



### button {#button}

Interactive button labeled "Run" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Debug Seo page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Run


### pre {#pre}

pre component

**Props:** className: string

**Usage:** Used in Debug Seo page



### header {#header}

header component

**Props:** className: string

**Usage:** Used in Debug Seo page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Dashboard page



### Dashboard {#dashboard}

Dashboard component

**Props:** 

**Usage:** Used in Dashboard page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Content Writer page



### FeatureGate {#featuregate}

FeatureGate component

**Props:** feature: string

**Usage:** Used in Content Writer page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Content Writer page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Content Writer page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Content Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### a {#a}

Navigation link labeled "Set Up CMS Connection" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Content Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button labeled "Create New Article" that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Create New Article


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### form {#form}

Form component for user input and data submission

**Props:** onSubmit: expression, className: string

**Usage:** Used in Content Writer page



### label {#label}

label component labeled "Article Title *"

**Props:** className: string

**Usage:** Used in Content Writer page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, onChange: expression, placeholder: string, className: string, required: unknown

**Usage:** Used in Content Writer page



### label {#label}

label component labeled "Website *"

**Props:** className: string

**Usage:** Used in Content Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string, required: unknown

**Usage:** Used in Content Writer page



### option {#option}

option component labeled "Select website..."

**Props:** value: string

**Usage:** Used in Content Writer page



### option {#option}

option component

**Props:** key: expression, value: expression

**Usage:** Used in Content Writer page



### label {#label}

label component labeled "CMS Connection"

**Props:** className: string

**Usage:** Used in Content Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

**Usage:** Used in Content Writer page



### option {#option}

option component labeled "Select CMS connection..."

**Props:** value: string

**Usage:** Used in Content Writer page



### option {#option}

option component labeled "(  )"

**Props:** key: expression, value: expression

**Usage:** Used in Content Writer page



### label {#label}

label component labeled "Target Keywords"

**Props:** className: string

**Usage:** Used in Content Writer page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, onChange: expression, placeholder: string, className: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button labeled "Cancel" that triggers user actions

**Props:** type: string, onClick: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Cancel


### button {#button}

Interactive button that triggers user actions

**Props:** type: string, disabled: expression, className: string

**Usage:** Used in Content Writer page



### label {#label}

label component labeled "Filter by website:"

**Props:** className: string

**Usage:** Used in Content Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

**Usage:** Used in Content Writer page



### option {#option}

option component labeled "All Websites"

**Props:** value: string

**Usage:** Used in Content Writer page



### option {#option}

option component

**Props:** key: expression, value: expression

**Usage:** Used in Content Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### a {#a}

Navigation link labeled "View Live Article" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Content Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### a {#a}

Navigation link labeled "Edit in Strapi" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Content Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Content Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Content Writer page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Cms Connections page



### FeatureGate {#featuregate}

FeatureGate component

**Props:** feature: string

**Usage:** Used in Cms Connections page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Cms Connections page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Cms Connections page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Cms Connections page



### button {#button}

Interactive button labeled "Connect CMS" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Connect CMS


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Cms Connections page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Cms Connections page



### OneClickCMSConnection {#oneclickcmsconnection}

OneClickCMSConnection component

**Props:** onConnectionComplete: expression, className: string

**Usage:** Used in Cms Connections page



### button {#button}

Interactive button labeled "Cancel" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Cancel


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Cms Connections page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Cms Connections page



### button {#button}

Interactive button labeled "Try Again" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Try Again


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Cms Connections page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Cms Connections page



### button {#button}

Interactive button labeled "Get Started" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Get Started


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Cms Connections page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Cms Connections page



### CMSConnectionsList {#cmsconnectionslist}

CMSConnectionsList component

**Props:** connections: expression, onConnectionDeleted: expression, onConnectionUpdated: expression

**Usage:** Used in Cms Connections page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Chat page



### ChatInterface {#chatinterface}

ChatInterface component

**Props:** 

**Usage:** Used in Chat page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Autopilot page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Autopilot page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Autopilot page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Autopilot page



### GSCConnection {#gscconnection}

GSCConnection component

**Props:** onConnectionChange: expression

**Usage:** Used in Autopilot page



### svg {#svg}

svg component

**Props:** className: string, fill: string, viewBox: string

**Usage:** Used in Autopilot page



### path {#path}

path component

**Props:** d: string

**Usage:** Used in Autopilot page



### code {#code}

code component labeled "<script src=“https://agent.seoagent.com/smart.js” data-site-id=“your-site-id”></script>"

**Props:** className: string

**Usage:** Used in Autopilot page



### button {#button}

Interactive button labeled "Get Tracking Script" that triggers user actions

**Props:** className: string

**Usage:** Used in Autopilot page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Autopilot page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Autopilot page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Article Writer page



### FeatureGate {#featuregate}

FeatureGate component

**Props:** feature: string

**Usage:** Used in Article Writer page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Article Writer page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Article Writer page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Article Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### a {#a}

Navigation link labeled "Set Up CMS Connection" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Article Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button labeled "Create New Article" that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Create New Article


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### form {#form}

Form component for user input and data submission

**Props:** onSubmit: expression, className: string

**Usage:** Used in Article Writer page



### label {#label}

label component labeled "Article Title *"

**Props:** className: string

**Usage:** Used in Article Writer page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, onChange: expression, placeholder: string, className: string, required: unknown

**Usage:** Used in Article Writer page



### label {#label}

label component labeled "Website *"

**Props:** className: string

**Usage:** Used in Article Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string, required: unknown

**Usage:** Used in Article Writer page



### option {#option}

option component labeled "Select website..."

**Props:** value: string

**Usage:** Used in Article Writer page



### option {#option}

option component

**Props:** key: expression, value: expression

**Usage:** Used in Article Writer page



### label {#label}

label component labeled "CMS Connection"

**Props:** className: string

**Usage:** Used in Article Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

**Usage:** Used in Article Writer page



### option {#option}

option component labeled "Select CMS connection..."

**Props:** value: string

**Usage:** Used in Article Writer page



### option {#option}

option component labeled "(  )"

**Props:** key: expression, value: expression

**Usage:** Used in Article Writer page



### label {#label}

label component labeled "Target Keywords"

**Props:** className: string

**Usage:** Used in Article Writer page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, onChange: expression, placeholder: string, className: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button labeled "Cancel" that triggers user actions

**Props:** type: string, onClick: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Cancel


### button {#button}

Interactive button that triggers user actions

**Props:** type: string, disabled: expression, className: string

**Usage:** Used in Article Writer page



### label {#label}

label component labeled "Filter by website:"

**Props:** className: string

**Usage:** Used in Article Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

**Usage:** Used in Article Writer page



### option {#option}

option component labeled "All Websites"

**Props:** value: string

**Usage:** Used in Article Writer page



### option {#option}

option component

**Props:** key: expression, value: expression

**Usage:** Used in Article Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### a {#a}

Navigation link labeled "View Live Article" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Article Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### a {#a}

Navigation link labeled "Edit in Strapi" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Article Writer page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Article Writer page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Article Writer page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Add Website page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Add Website page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Add Website page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Add Website page



### strong {#strong}

strong component labeled "</body>"

**Props:** 

**Usage:** Used in Add Website page



### textarea {#textarea}

Input field for user data entry

**Props:** className: string, rows: expression, readOnly: unknown, value: expression

**Usage:** Used in Add Website page



### button {#button}

Interactive button labeled "Copy Code" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Add Website page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Copy Code


### a {#a}

Navigation link labeled "Done" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Add Website page



### svg {#svg}

svg component

**Props:** xmlns: string, width: string, height: string, viewBox: string, fill: string, stroke: string, strokeWidth: string, strokeLinecap: string, strokeLinejoin: string, className: string

**Usage:** Used in Add Website page



### path {#path}

path component

**Props:** d: string

**Usage:** Used in Add Website page



### form {#form}

Form component for user input and data submission

**Props:** onSubmit: expression, className: string

**Usage:** Used in Add Website page



### svg {#svg}

svg component

**Props:** className: string, viewBox: string, fill: string

**Usage:** Used in Add Website page



### path {#path}

path component

**Props:** fillRule: string, d: string, clipRule: string

**Usage:** Used in Add Website page



### label {#label}

label component labeled "Domain Name"

**Props:** htmlFor: string, className: string

**Usage:** Used in Add Website page



### input {#input}

Input field for user data entry

**Props:** type: string, id: string, value: expression, onChange: expression, className: string, placeholder: string, required: unknown

**Usage:** Used in Add Website page



### label {#label}

label component labeled "Language"

**Props:** htmlFor: string, className: string

**Usage:** Used in Add Website page



### select {#select}

Input field for user data entry

**Props:** id: string, value: expression, onChange: expression, className: string

**Usage:** Used in Add Website page



### option {#option}

option component

**Props:** key: expression, value: expression

**Usage:** Used in Add Website page



### input {#input}

Input field for user data entry

**Props:** id: string, type: string, checked: expression, onChange: expression, className: string

**Usage:** Used in Add Website page



### label {#label}

label component labeled "Enable AI Meta Tags"

**Props:** htmlFor: string, className: string

**Usage:** Used in Add Website page



### input {#input}

Input field for user data entry

**Props:** id: string, type: string, checked: expression, onChange: expression, className: string

**Usage:** Used in Add Website page



### label {#label}

label component labeled "Enable AI Image Alt-Tags"

**Props:** htmlFor: string, className: string

**Usage:** Used in Add Website page



### button {#button}

Interactive button labeled "Cancel" that triggers user actions

**Props:** type: string, onClick: expression, className: string

**Usage:** Used in Add Website page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Cancel


### button {#button}

Interactive button that triggers user actions

**Props:** type: string, disabled: expression, className: string

**Usage:** Used in Add Website page



### svg {#svg}

svg component

**Props:** className: string, xmlns: string, fill: string, viewBox: string

**Usage:** Used in Add Website page



### circle {#circle}

circle component

**Props:** className: string, cx: string, cy: string, r: string, stroke: string, strokeWidth: string

**Usage:** Used in Add Website page



### path {#path}

path component

**Props:** className: string, fill: string, d: string

**Usage:** Used in Add Website page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in Add Website page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in Add Website page



### ProtectedRoute {#protectedroute}

ProtectedRoute component

**Props:** 

**Usage:** Used in Account page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Account page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Account page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Account page



### header {#header}

header component

**Props:** className: string

**Usage:** Used in Account page



### label {#label}

label component labeled "Email"

**Props:** className: string

**Usage:** Used in Account page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, disabled: unknown, className: string

**Usage:** Used in Account page



### label {#label}

label component labeled "User ID"

**Props:** className: string

**Usage:** Used in Account page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, disabled: unknown, className: string

**Usage:** Used in Account page



### label {#label}

label component labeled "Account Created"

**Props:** className: string

**Usage:** Used in Account page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, disabled: unknown, className: string

**Usage:** Used in Account page



### header {#header}

header component

**Props:** className: string

**Usage:** Used in Account page



### button {#button}

Interactive button labeled "Sign Out" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Account page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Sign Out


### WebsiteManagement {#websitemanagement}

WebsiteManagement component

**Props:** 

**Usage:** Used in Account page



### SubscriptionManager {#subscriptionmanager}

SubscriptionManager component

**Props:** 

**Usage:** Used in Account page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [website Id] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [website Id] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [website Id] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [website Id] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [website Id] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [website Id] page



### button {#button}

Interactive button labeled "Return to Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Return to Dashboard


### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [website Id] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [website Id] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [website Id] page



### nav {#nav}

Navigation component for site/app navigation

**Props:** className: string, aria-label: string

**Usage:** Used in [website Id] page



### ol {#ol}

ol component

**Props:** className: string

**Usage:** Used in [website Id] page



### li {#li}

li component

**Props:** className: string

**Usage:** Used in [website Id] page



### button {#button}

Interactive button labeled "Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Dashboard


### svg {#svg}

svg component

**Props:** className: string, fill: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** d: string

**Usage:** Used in [website Id] page



### li {#li}

li component

**Props:** 

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** fillRule: string, d: string, clipRule: string

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [website Id] page



### code {#code}

code component

**Props:** className: string

**Usage:** Used in [website Id] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [token] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [token] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [token] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [token] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [token] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [token] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link labeled "Back to Dashboard" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### header {#header}

header component

**Props:** className: string

**Usage:** Used in [token] page



### table {#table}

table component

**Props:** className: string

**Usage:** Used in [token] page



### thead {#thead}

thead component

**Props:** className: string

**Usage:** Used in [token] page



### tr {#tr}

tr component

**Props:** 

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### tbody {#tbody}

tbody component

**Props:** className: string

**Usage:** Used in [token] page



### tr {#tr}

tr component

**Props:** 

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** colSpan: expression, className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### tr {#tr}

tr component

**Props:** key: expression

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Edit" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Delete" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [token] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [token] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [token] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [token] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in [token] page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in [token] page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link labeled "Back to Dashboard" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### header {#header}

header component

**Props:** className: string

**Usage:** Used in [token] page



### table {#table}

table component

**Props:** className: string

**Usage:** Used in [token] page



### thead {#thead}

thead component

**Props:** className: string

**Usage:** Used in [token] page



### tr {#tr}

tr component

**Props:** 

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### th {#th}

th component

**Props:** className: string

**Usage:** Used in [token] page



### tbody {#tbody}

tbody component

**Props:** className: string

**Usage:** Used in [token] page



### tr {#tr}

tr component

**Props:** 

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** colSpan: expression, className: string

**Usage:** Used in [token] page



### svg {#svg}

svg component

**Props:** className: string, fill: string, stroke: string, viewBox: string

**Usage:** Used in [token] page



### path {#path}

path component

**Props:** strokeLinecap: string, strokeLinejoin: string, strokeWidth: expression, d: string

**Usage:** Used in [token] page



### tr {#tr}

tr component

**Props:** key: expression

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### Image {#image}

Image component

**Props:** src: expression, alt: expression, width: expression, height: expression, className: string, onError: expression

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### td {#td}

td component

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Edit" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Delete" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Cms Connection page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Cms Connection page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Cms Connection page



### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Cms Connection page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Cms Connection page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Cms Connection page



### button {#button}

Interactive button labeled "Return to Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Return to Dashboard


### Sidebar {#sidebar}

Sidebar component

**Props:** sidebarOpen: expression, setSidebarOpen: expression, sidebarExpanded: expression, setSidebarExpanded: expression

**Usage:** Used in Cms Connection page



### Header {#header}

Header component

**Props:** sidebarOpen: expression, setSidebarOpen: expression

**Usage:** Used in Cms Connection page



### main {#main}

main component

**Props:** className: string

**Usage:** Used in Cms Connection page



### nav {#nav}

Navigation component for site/app navigation

**Props:** className: string, aria-label: string

**Usage:** Used in Cms Connection page



### ol {#ol}

ol component

**Props:** className: string

**Usage:** Used in Cms Connection page



### li {#li}

li component

**Props:** className: string

**Usage:** Used in Cms Connection page



### button {#button}

Interactive button labeled "Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Dashboard


### li {#li}

li component

**Props:** 

**Usage:** Used in Cms Connection page



### svg {#svg}

svg component

**Props:** className: string, fill: string, viewBox: string

**Usage:** Used in Cms Connection page



### path {#path}

path component

**Props:** fillRule: string, d: string, clipRule: string

**Usage:** Used in Cms Connection page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### li {#li}

li component

**Props:** 

**Usage:** Used in Cms Connection page



### svg {#svg}

svg component

**Props:** className: string, fill: string, viewBox: string

**Usage:** Used in Cms Connection page



### path {#path}

path component

**Props:** fillRule: string, d: string, clipRule: string

**Usage:** Used in Cms Connection page



### svg {#svg}

svg component

**Props:** className: string, viewBox: string, fill: string

**Usage:** Used in Cms Connection page



### path {#path}

path component

**Props:** fillRule: string, d: string, clipRule: string

**Usage:** Used in Cms Connection page



### svg {#svg}

svg component

**Props:** className: string, fill: string, viewBox: string

**Usage:** Used in Cms Connection page



### path {#path}

path component

**Props:** d: string

**Usage:** Used in Cms Connection page



### button {#button}

Interactive button labeled "Disconnect" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Disconnect


### OneClickCMSConnection {#oneclickcmsconnection}

OneClickCMSConnection component

**Props:** onConnectionComplete: expression

**Usage:** Used in Cms Connection page


