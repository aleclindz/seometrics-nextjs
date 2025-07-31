# User Flows

## Landing Page {#landing-page}

**Description:** Main entry point where users first visit the website to learn about the product/service

**Steps:**
1. **Create Account Button**
   - **UI Component:** [landing-page](frontend.md#landing-page)
   - **Event:** `onClick`
   - **API Call:** [create-account-function](backend.md#create-account-function)
   - **Service:** `createAccount`
   - **Database:** `users`
   - **Result:** Navigate to signup-page

2. **Login Button**
   - **UI Component:** [landing-page](frontend.md#landing-page)
   - **Event:** `onClick`
   - **API Call:** [authenticate-user-function](backend.md#authenticate-user-function)
   - **Service:** `authenticateUser`
   - **Database:** `users`
   - **Result:** Navigate to dashboard


---

## Dashboard {#dashboard}

**Description:** Main user interface after login where users manage their account and access features

**Steps:**
1. **Profile Settings**
   - **UI Component:** [dashboard](frontend.md#dashboard)
   - **Event:** `onClick`
   
   
   
   - **Result:** Navigate to profile-settings

2. **Manage Websites**
   - **UI Component:** [dashboard](frontend.md#dashboard)
   - **Event:** `onClick`
   
   
   
   - **Result:** Navigate to website-management


---

## Login Page {#login-page}

**Description:** Page for users to log into their existing accounts

**Steps:**
1. **Submit Login**
   - **UI Component:** [login-page](frontend.md#login-page)
   - **Event:** `onSubmit`
   - **API Call:** [authenticate-user-function](backend.md#authenticate-user-function)
   - **Service:** `authenticateUser`
   - **Database:** `users`
   - **Result:** Navigate to dashboard

2. **Forgot Password Link**
   - **UI Component:** [login-page](frontend.md#login-page)
   - **Event:** `onClick`
   
   
   
   - **Result:** Navigate to forgot-password


---

## Website Management Page {#website-management}

**Description:** Interface for users to manage their websites and SEO settings

**Steps:**
1. **Add New Website**
   - **UI Component:** [website-management](frontend.md#website-management)
   - **Event:** `onClick`
   - **API Call:** [add-website-function](backend.md#add-website-function)
   - **Service:** `addWebsite`
   - **Database:** `websites`
   - **Result:** Navigate to add-website

2. **Edit Website**
   - **UI Component:** [website-management](frontend.md#website-management)
   - **Event:** `onClick`
   
   
   
   - **Result:** Navigate to edit-website


---

## Terms Page {#terms-page}

**Description:** Page displaying the terms of service for the application

**Steps:**


---

## Privacy Page {#privacy-page}

**Description:** Page detailing the privacy policy of the application

**Steps:**


---

## Debug SEO Page {#debug-seo-page}

**Description:** Page for users to test and debug SEO settings

**Steps:**
1. **Test SEO Settings**
   - **UI Component:** [debug-seo-page](frontend.md#debug-seo-page)
   - **Event:** `onClick`
   - **API Call:** [test-seo-settings-function](backend.md#test-seo-settings-function)
   - **Service:** `testSeoSettings`
   - **Database:** `websites`
   - **Result:** Navigate to debug-results


---
