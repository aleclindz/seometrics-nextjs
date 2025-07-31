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


### Feature Gate
**Route**: `/unknown`

The Feature Gate page provides user interface and functionality for feature gate related features.

**Interactive Components**: 2
- ⚡ Upgrade Now, ← Back to Dashboard

### App
**Route**: `/`

The App page provides user interface and functionality for app related features.


### Layout
**Route**: `/layout.tsx`

The Layout page provides user interface and functionality for layout related features.

**Interactive Components**: 5
- link, link, link, link, link

### Terms
**Route**: `/terms`

The Terms page provides user interface and functionality for terms related features.

**Interactive Components**: 1
- legal@seoagent.com

### Strategy
**Route**: `/strategy`

The Strategy page provides user interface and functionality for strategy related features.

**Interactive Components**: 2
- input, Join Waitlist

### Privacy
**Route**: `/privacy`

The Privacy page provides user interface and functionality for privacy related features.

**Interactive Components**: 1
- privacy@seoagent.com

### Login
**Route**: `/login`

The Login page provides user interface and functionality for login related features.

**Interactive Components**: 6
- form, input, input, button, button, LoginForm

### Keywords
**Route**: `/keywords`

The Keywords page provides user interface and functionality for keywords related features.


### Debug Seo
**Route**: `/debug-seo`

The Debug Seo page provides user interface and functionality for debug seo related features.

**Interactive Components**: 3
- Back to Dashboard, Run All Tests, Run

### Dashboard
**Route**: `/dashboard`

The Dashboard page provides user interface and functionality for dashboard related features.


### Content Writer
**Route**: `/content-writer`

The Content Writer page provides user interface and functionality for content writer related features.

**Interactive Components**: 17
- button, Set Up CMS Connection, Create New Article, form, input, select, select, input, Cancel, button, select, button, button, button, View Live Article, Edit in Strapi, button

### Cms Connections
**Route**: `/cms-connections`

The Cms Connections page provides user interface and functionality for cms connections related features.

**Interactive Components**: 4
- Connect CMS, Cancel, Try Again, Get Started

### Chat
**Route**: `/chat`

The Chat page provides user interface and functionality for chat related features.


### Autopilot
**Route**: `/autopilot`

The Autopilot page provides user interface and functionality for autopilot related features.

**Interactive Components**: 1
- Get Tracking Script

### Article Writer
**Route**: `/article-writer`

The Article Writer page provides user interface and functionality for article writer related features.

**Interactive Components**: 17
- button, Set Up CMS Connection, Create New Article, form, input, select, select, input, Cancel, button, select, button, button, button, View Live Article, Edit in Strapi, button

### Add Website
**Route**: `/add-website`

The Add Website page provides user interface and functionality for add website related features.

**Interactive Components**: 10
- textarea, Copy Code, Done, form, input, select, input, input, Cancel, button

### Account
**Route**: `/account`

The Account page provides user interface and functionality for account related features.

**Interactive Components**: 4
- input, input, input, Sign Out

### [website Id]
**Route**: `/website/[websiteId]`

The [website Id] page provides user interface and functionality for [website id] related features.

**Interactive Components**: 5
- Return to Dashboard, Dashboard, button, button

### [token]
**Route**: `/meta-tags/[token]`

The [token] page provides user interface and functionality for [token] related features.

**Interactive Components**: 4
- Back to Dashboard, a, Edit, Delete

### [token]
**Route**: `/alt-tags/[token]`

The [token] page provides user interface and functionality for [token] related features.

**Interactive Components**: 4
- Back to Dashboard, a, Edit, Delete

### Cms Connection
**Route**: `/website/[websiteId]/cms-connection`

The Cms Connection page provides user interface and functionality for cms connection related features.

**Interactive Components**: 5
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

This React application consists of **23 pages** with **92 components** (90 interactive).

## Pages Structure

- **[Upgrade Badge](#upgrade-badge)** (`/unknown`) - 1 components
- **[Protected Route](#protected-route)** (`/unknown`) - 0 components
- **[Feature Gate](#feature-gate)** (`/unknown`) - 2 components
- **[App](#app)** (`/`) - 0 components
- **[Layout](#layout)** (`/layout.tsx`) - 5 components
- **[Terms](#terms)** (`/terms`) - 1 components
- **[Strategy](#strategy)** (`/strategy`) - 2 components
- **[Privacy](#privacy)** (`/privacy`) - 1 components
- **[Login](#login)** (`/login`) - 6 components
- **[Keywords](#keywords)** (`/keywords`) - 0 components
- **[Debug Seo](#debug-seo)** (`/debug-seo`) - 3 components
- **[Dashboard](#dashboard)** (`/dashboard`) - 0 components
- **[Content Writer](#content-writer)** (`/content-writer`) - 17 components
- **[Cms Connections](#cms-connections)** (`/cms-connections`) - 4 components
- **[Chat](#chat)** (`/chat`) - 0 components
- **[Autopilot](#autopilot)** (`/autopilot`) - 1 components
- **[Article Writer](#article-writer)** (`/article-writer`) - 17 components
- **[Add Website](#add-website)** (`/add-website`) - 10 components
- **[Account](#account)** (`/account`) - 4 components
- **[[website Id]](#website-id)** (`/website/[websiteId]`) - 5 components
- **[[token]](#token)** (`/meta-tags/[token]`) - 4 components
- **[[token]](#token)** (`/alt-tags/[token]`) - 4 components
- **[Cms Connection](#cms-connection)** (`/website/[websiteId]/cms-connection`) - 5 components

## Component Distribution

- **Buttons & Actions**: 45
- **Input Fields**: 21
- **Navigation Links**: 19
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


### link {#link}

Navigation link that takes users to different pages

**Props:** rel: string, href: string, sizes: string

**Usage:** Used in Layout page



### link {#link}

Navigation link that takes users to different pages

**Props:** rel: string, href: string, sizes: string, type: string

**Usage:** Used in Layout page



### link {#link}

Navigation link that takes users to different pages

**Props:** rel: string, href: string, sizes: string, type: string

**Usage:** Used in Layout page



### link {#link}

Navigation link that takes users to different pages

**Props:** rel: string, href: string

**Usage:** Used in Layout page



### link {#link}

Navigation link that takes users to different pages

**Props:** rel: string, href: string

**Usage:** Used in Layout page



### a {#a}

Navigation link labeled "legal@seoagent.com" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Terms page



### input {#input}

Input field for user data entry

**Props:** type: string, placeholder: string, className: string

**Usage:** Used in Strategy page



### button {#button}

Interactive button labeled "Join Waitlist" that triggers user actions

**Props:** className: string

**Usage:** Used in Strategy page



### a {#a}

Navigation link labeled "privacy@seoagent.com" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Privacy page



### form {#form}

Form component for user input and data submission

**Props:** className: string, onSubmit: expression

**Usage:** Used in Login page



### input {#input}

Input field for user data entry

**Props:** id: string, name: string, type: string, autoComplete: string, required: unknown, value: expression, onChange: expression, className: string

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


### LoginForm {#loginform}

Form component for user input and data submission

**Props:** 

**Usage:** Used in Login page



### a {#a}

Navigation link labeled "Back to Dashboard" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Debug Seo page



### button {#button}

Interactive button labeled "Run All Tests" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Debug Seo page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Run All Tests


### button {#button}

Interactive button labeled "Run" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Debug Seo page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Run


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### a {#a}

Navigation link labeled "Set Up CMS Connection" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button labeled "Create New Article" that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Create New Article


### form {#form}

Form component for user input and data submission

**Props:** onSubmit: expression, className: string

**Usage:** Used in Content Writer page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, onChange: expression, placeholder: string, className: string, required: unknown

**Usage:** Used in Content Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string, required: unknown

**Usage:** Used in Content Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

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



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### a {#a}

Navigation link labeled "View Live Article" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Content Writer page



### a {#a}

Navigation link labeled "Edit in Strapi" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Content Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Content Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button labeled "Connect CMS" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Connect CMS


### button {#button}

Interactive button labeled "Cancel" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Cancel


### button {#button}

Interactive button labeled "Try Again" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Try Again


### button {#button}

Interactive button labeled "Get Started" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connections page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Get Started


### button {#button}

Interactive button labeled "Get Tracking Script" that triggers user actions

**Props:** className: string

**Usage:** Used in Autopilot page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### a {#a}

Navigation link labeled "Set Up CMS Connection" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button labeled "Create New Article" that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Create New Article


### form {#form}

Form component for user input and data submission

**Props:** onSubmit: expression, className: string

**Usage:** Used in Article Writer page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, onChange: expression, placeholder: string, className: string, required: unknown

**Usage:** Used in Article Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string, required: unknown

**Usage:** Used in Article Writer page



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

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



### select {#select}

Input field for user data entry

**Props:** value: expression, onChange: expression, className: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### a {#a}

Navigation link labeled "View Live Article" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Article Writer page



### a {#a}

Navigation link labeled "Edit in Strapi" that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in Article Writer page



### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in Article Writer page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


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



### form {#form}

Form component for user input and data submission

**Props:** onSubmit: expression, className: string

**Usage:** Used in Add Website page



### input {#input}

Input field for user data entry

**Props:** type: string, id: string, value: expression, onChange: expression, className: string, placeholder: string, required: unknown

**Usage:** Used in Add Website page



### select {#select}

Input field for user data entry

**Props:** id: string, value: expression, onChange: expression, className: string

**Usage:** Used in Add Website page



### input {#input}

Input field for user data entry

**Props:** id: string, type: string, checked: expression, onChange: expression, className: string

**Usage:** Used in Add Website page



### input {#input}

Input field for user data entry

**Props:** id: string, type: string, checked: expression, onChange: expression, className: string

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



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, disabled: unknown, className: string

**Usage:** Used in Account page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, disabled: unknown, className: string

**Usage:** Used in Account page



### input {#input}

Input field for user data entry

**Props:** type: string, value: expression, disabled: unknown, className: string

**Usage:** Used in Account page



### button {#button}

Interactive button labeled "Sign Out" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Account page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Sign Out


### button {#button}

Interactive button labeled "Return to Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Return to Dashboard


### nav {#nav}

Navigation component for site/app navigation

**Props:** className: string, aria-label: string

**Usage:** Used in [website Id] page



### button {#button}

Interactive button labeled "Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Dashboard


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, disabled: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in [website Id] page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### a {#a}

Navigation link labeled "Back to Dashboard" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Edit" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Delete" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link labeled "Back to Dashboard" that takes users to different pages

**Props:** href: string, className: string

**Usage:** Used in [token] page



### a {#a}

Navigation link that takes users to different pages

**Props:** href: expression, target: string, rel: string, className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Edit" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Delete" that triggers user actions

**Props:** className: string

**Usage:** Used in [token] page



### button {#button}

Interactive button labeled "Return to Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Return to Dashboard


### nav {#nav}

Navigation component for site/app navigation

**Props:** className: string, aria-label: string

**Usage:** Used in Cms Connection page



### button {#button}

Interactive button labeled "Dashboard" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Dashboard


### button {#button}

Interactive button that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks button


### button {#button}

Interactive button labeled "Disconnect" that triggers user actions

**Props:** onClick: expression, className: string

**Usage:** Used in Cms Connection page


**Events → Backend:**
- `click` ➜ [undefined](backend.md#undefined) - User clicks Disconnect

