# Database Documentation

# Database Documentation

This document provides a comprehensive overview of the database architecture, schema, query patterns, data models, and performance considerations for the project utilizing Supabase as the database solution.

## 1. Database Architecture

### 1.1 Database Type
- **Type**: Supabase (PostgreSQL)
- **Hosting**: Supabase provides a managed PostgreSQL database hosted in the cloud.

### 1.2 Connection Details
- **Client Library**: `@supabase/supabase-js`
- **SSR Library**: `@supabase/ssr`
- **Connection String**: The connection string is typically provided in the environment variables and follows the format:
  ```
  supabaseUrl = 'https://<project-ref>.supabase.co'
  supabaseKey = '<anon-key>'
  ```
- **Initialization**:
  ```javascript
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(supabaseUrl, supabaseKey);
  ```

## 2. Schema Overview

### 2.1 Tables/Collections
The following is a high-level overview of the primary tables utilized in the database. Each table includes its purpose and key relationships.

| Table Name             | Description                                      | Relationships                |
|------------------------|--------------------------------------------------|------------------------------|
| users                  | Stores user information                          | One-to-many with profiles    |
| profiles               | Stores user profile details                      | One-to-one with users        |
| posts                  | Contains blog posts                              | Many-to-one with users       |
| comments               | Stores comments on posts                         | Many-to-one with posts       |
| categories             | Categorizes posts                                | Many-to-many with posts      |
| tags                   | Tags for posts                                   | Many-to-many with posts      |
| settings               | User-specific settings                          | One-to-one with users        |

### 2.2 Relationships
- **Users to Profiles**: One-to-one relationship where each user has one profile.
- **Users to Posts**: One-to-many relationship where each user can create multiple posts.
- **Posts to Comments**: One-to-many relationship where each post can have multiple comments.
- **Posts to Categories/Tags**: Many-to-many relationships allowing posts to be categorized and tagged.

## 3. Query Patterns

### 3.1 Data Access
Data is accessed primarily through the following methods:

- **Select Queries**: Fetching data from tables.
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId);
  ```

- **Insert Queries**: Adding new records.
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .insert([{ title: 'New Post', content: 'Post content', user_id: userId }]);
  ```

- **Update Queries**: Modifying existing records.
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .update({ title: 'Updated Title' })
    .eq('id', postId);
  ```

- **Delete Queries**: Removing records.
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  ```

### 3.2 Data Modification
Data modification follows RESTful principles, where HTTP methods correspond to CRUD operations.

## 4. Data Models

### 4.1 Structure
Each table has a defined structure with specific fields. Below are examples of the structure for key tables:

#### Users Table
| Field Name | Type       | Constraints            |
|------------|------------|------------------------|
| id         | UUID       | Primary Key            |
| email      | VARCHAR    | Unique, Not Null       |
| password   | VARCHAR    | Not Null               |
| created_at | TIMESTAMP  | Default: now()         |

#### Posts Table
| Field Name | Type       | Constraints            |
|------------|------------|------------------------|
| id         | UUID       | Primary Key            |
| title      | VARCHAR    | Not Null               |
| content    | TEXT       | Not Null               |
| user_id    | UUID       | Foreign Key (users.id) |
| created_at | TIMESTAMP  | Default: now()         |

### 4.2 Validation Rules
Validation rules are enforced at the application level, ensuring that required fields are populated and data types are respected before any database operations are executed.

## 5. Performance Considerations

### 5.1 Indexing
To enhance query performance, the following indexes are recommended:
- Index on `user_id` in the `posts` table to speed up user-specific queries.
- Index on `post_id` in the `comments` table to optimize comment retrieval for specific posts.
- Composite indexes on `tags` and `categories` for efficient filtering.

### 5.2 Optimization Techniques
- **Batch Inserts**: Use batch inserts for adding multiple records to reduce the number of transactions.
- **Pagination**: Implement pagination for queries that return large datasets to improve load times and reduce server load.
- **Caching**: Utilize caching strategies for frequently accessed data to minimize database hits.

## 6. Files with Database Queries

### 6.1 File: `src/app/api/admin/check-schema/route.ts`
- **Queries**: This file contains API routes that check the current database schema against expected configurations.

### 6.2 File: `docs-improved/database-schema.md`
- **Queries**: This documentation file outlines the database schema in detail, including tables, relationships, and data types.

### 6.3 File: `supabase/migrations/021_cms_content_schemas.sql`
- **Queries**: This migration file defines the schema for content management, including the creation of tables and relationships.

### 6.4 File: `supabase/migrations/001_initial_schema.sql`
- **Queries**: This migration file sets up the initial database schema, creating essential tables and establishing primary keys.

## Conclusion
This documentation serves as a guide for developers working with the Supabase database in this project. It provides essential information on the architecture, schema, query patterns, data models, and performance considerations necessary for effective database management and application development.

## Schema



## Queries

