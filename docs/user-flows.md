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

**Description:** Page for users to enter their credentials and log into their account

**Steps:**
1. **Submit Login Form**
   - **UI Component:** [login-page](frontend.md#login-page)
   - **Event:** `onSubmit`
   - **API Call:** [authenticate-user-function](backend.md#authenticate-user-function)
   - **Service:** `authenticateUser`
   - **Database:** `users`
   - **Result:** Navigate to dashboard


---

## Website Management Page {#website-management}

**Description:** Page where users can manage their connected websites

**Steps:**
1. **Add Website Button**
   - **UI Component:** [website-management](frontend.md#website-management)
   - **Event:** `onClick`
   - **API Call:** [add-website-function](backend.md#add-website-function)
   - **Service:** `addWebsite`
   - **Database:** `websites`
   - **Result:** Navigate to add-website-page

2. **Edit Website Button**
   - **UI Component:** [website-management](frontend.md#website-management)
   - **Event:** `onClick`
   - **API Call:** [update-website-function](backend.md#update-website-function)
   - **Service:** `updateWebsite`
   - **Database:** `websites`
   - **Result:** Navigate to edit-website-page


---

## Terms Page {#terms-page}

**Description:** Page displaying the terms and conditions of using the application

**Steps:**
1. **Accept Terms Button**
   - **UI Component:** [terms-page](frontend.md#terms-page)
   - **Event:** `onClick`
   - **API Call:** [accept-terms-function](backend.md#accept-terms-function)
   - **Service:** `acceptTerms`
   - **Database:** `users`
   - **Result:** Navigate to dashboard


---

## Privacy Page {#privacy-page}

**Description:** Page displaying the privacy policy of the application

**Steps:**


---

## Debug SEO Page {#debug-seo-page}

**Description:** Page for debugging SEO-related issues for the user's websites

**Steps:**
1. **Run Debug Tool**
   - **UI Component:** [debug-seo-page](frontend.md#debug-seo-page)
   - **Event:** `onClick`
   - **API Call:** [run-debug-seo-function](backend.md#run-debug-seo-function)
   - **Service:** `runDebugSeo`
   - **Database:** `websites`
   - **Result:** Navigate to debug-results-page


---
