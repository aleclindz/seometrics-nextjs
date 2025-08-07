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

2. **View Websites**
   - **UI Component:** [dashboard](frontend.md#dashboard)
   - **Event:** `onClick`
   
   
   
   - **Result:** Navigate to website-page


---

## Website Page {#website-page}

**Description:** Page where users can manage their websites and SEO settings

**Steps:**
1. **Add Website Button**
   - **UI Component:** [website-page](frontend.md#website-page)
   - **Event:** `onClick`
   - **API Call:** [add-website-function](backend.md#add-website-function)
   - **Service:** `addWebsite`
   - **Database:** `websites`
   - **Result:** Navigate to add-website-page

2. **Edit Website Button**
   - **UI Component:** [website-page](frontend.md#website-page)
   - **Event:** `onClick`
   - **API Call:** [edit-website-function](backend.md#edit-website-function)
   - **Service:** `editWebsite`
   - **Database:** `websites`
   - **Result:** Navigate to edit-website-page


---

## Terms Page {#terms-page}

**Description:** Page displaying the terms and conditions of using the application

**Steps:**


---

## Privacy Page {#privacy-page}

**Description:** Page displaying the privacy policy of the application

**Steps:**


---

## Login Page {#login-page}

**Description:** Page for users to log into their accounts

**Steps:**
1. **Submit Login Form**
   - **UI Component:** [login-page](frontend.md#login-page)
   - **Event:** `onSubmit`
   - **API Call:** [authenticate-user-function](backend.md#authenticate-user-function)
   - **Service:** `authenticateUser`
   - **Database:** `users`
   - **Result:** Navigate to dashboard


---

## Debug SEO Page {#debug-seo-page}

**Description:** Page for users to analyze and debug SEO issues

**Steps:**


---
