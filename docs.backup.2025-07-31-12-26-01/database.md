# Database Documentation

# Database Documentation

## 1. Database Architecture

### Type
The project utilizes **Supabase** as its database solution. Supabase is an open-source backend-as-a-service that provides a PostgreSQL database, real-time subscriptions, authentication, and storage.

### Hosting
Supabase is hosted on its cloud platform, which provides automatic scaling and management of the PostgreSQL database. The hosting environment is designed to ensure high availability and performance.

### Connection Details
To connect to the Supabase database, the following parameters are typically required:

- **URL**: The unique endpoint for the Supabase project (e.g., `https://your-project.supabase.co`)
- **Public API Key**: A key used for client-side access to the Supabase services.
- **Database URL**: The connection string for PostgreSQL, which includes the database name, username, password, and host.

Example connection string:
```
postgres://username:password@host:port/database
```

### Dependencies
This project relies on the following dependencies for interacting with Supabase:

- `@supabase/ssr`: A library for server-side rendering with Supabase.
- `@supabase/supabase-js`: The official JavaScript client library for Supabase, used for interacting with the database and other Supabase services.

## 2. Schema Overview

The database schema is defined through SQL migration files. Below is an overview of the key migrations and their roles:

### File: `supabase/migrations/001_initial_schema.sql`
This migration file sets up the initial database schema. It includes the creation of essential tables and their relationships. 

**Key Tables:**
- **Users**: Stores user information and authentication details.
- **Posts**: Contains content created by users, including titles, body text, and timestamps.
- **Comments**: Stores comments made on posts, linking back to both the `Users` and `Posts` tables.

### File: `supabase/migrations/021_cms_content_schemas.sql`
This migration file expands the schema to include additional content management structures. 

**Key Additions:**
- **Categories**: A table for categorizing posts.
- **Tags**: A table for tagging posts with multiple keywords.
- **Post_Categories**: A join table to establish a many-to-many relationship between `Posts` and `Categories`.

### Relationships
- **Users** to **Posts**: One-to-Many (A user can have multiple posts).
- **Posts** to **Comments**: One-to-Many (A post can have multiple comments).
- **Posts** to **Categories**: Many-to-Many (A post can belong to multiple categories through the `Post_Categories` join table).

## 3. Query Patterns

Data access and modification in this project are primarily executed through the Supabase client library. Below are common query patterns:

### Data Retrieval
- **Fetching Posts**: 
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  ```

- **Fetching Comments for a Post**:
  ```javascript
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId);
  ```

### Data Insertion
- **Creating a New Post**:
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .insert([{ title: 'New Post', body: 'Post content here', user_id: userId }]);
  ```

- **Adding a Comment**:
  ```javascript
  const { data, error } = await supabase
    .from('comments')
    .insert([{ body: 'Great post!', post_id: postId, user_id: userId }]);
  ```

### Data Updates
- **Updating a Post**:
  ```javascript
  const { data, error } = await supabase
    .from('posts')
    .update({ title: 'Updated Title' })
    .eq('id', postId);
  ```

### Data Deletion
- **Deleting a Comment**:
  ```javascript
  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  ```

## 4. Data Models

### Users Table
- **Fields**:
  - `id`: UUID (Primary Key)
  - `email`: String (Unique)
  - `password`: String (Hashed)
  - `created_at`: Timestamp

### Posts Table
- **Fields**:
  - `id`: UUID (Primary Key)
  - `title`: String (Not Null)
  - `body`: Text (Not Null)
  - `user_id`: UUID (Foreign Key referencing Users)
  - `created_at`: Timestamp

### Comments Table
- **Fields**:
  - `id`: UUID (Primary Key)
  - `body`: Text (Not Null)
  - `post_id`: UUID (Foreign Key referencing Posts)
  - `user_id`: UUID (Foreign Key referencing Users)
  - `created_at`: Timestamp

### Categories Table
- **Fields**:
  - `id`: UUID (Primary Key)
  - `name`: String (Unique, Not Null)

### Tags Table
- **Fields**:
  - `id`: UUID (Primary Key)
  - `name`: String (Unique, Not Null)

### Post_Categories Table
- **Fields**:
  - `post_id`: UUID (Foreign Key referencing Posts)
  - `category_id`: UUID (Foreign Key referencing Categories)

## 5. Performance Considerations

### Indexing
To optimize query performance, it is recommended to create indexes on frequently queried fields, such as:
- `user_id` in the `posts` and `comments` tables.
- `post_id` in the `comments` table.
- `category_id` in the `post_categories` table.

### Optimization Strategies
- **Batch Inserts**: Use batch inserts for adding multiple records at once to reduce the number of database transactions.
- **Pagination**: Implement pagination for retrieving large datasets to improve load times and reduce memory usage.
- **Caching**: Utilize caching strategies for frequently accessed data to minimize database load.

By following these guidelines and understanding the database structure, developers can effectively work with the Supabase database in this project.

## Schema



## Queries

