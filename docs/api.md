1. Site Configuration API
    #### GET /site/config
    Returns the site's basic configuration.

    Response Structure:
    ```typescript
    interface SiteConfig {
    title: string;
    description: string;
    nav_links: {
        projects: number;  // 0 or 1
        blog: number;
        pics: number;
        about: number;
        contact: number;
    }
    about_description: string | null;
    about_sections: AboutSection[];
    }
    ```
    #### WebSocket: SITE_CONFIG_UPDATE Event
    Subscribe to real-time config updates.
    ```typescript
    interface SiteConfigUpdate {
    type: 'SITE_CONFIG_UPDATE';
    data: {
        config: SiteConfig;
    }
    }
    ```

2. Posts API
    #### GET /posts
    Returns all published posts.

    Response Structure:
    ```typescript
    interface Post {
    slug: string;
    title: string;
    content: string;
    markdown_content: string;
    html_content: string;
    metadata: {
        description?: string;
        // other metadata fields
    };
    published: number; // 0 or 1
    published_at: string;
    created_at: string;
    }

    interface PostsResponse {
    posts: Post[];
    }
    ```

    #### GET /posts/:id
    Returns a single post by ID.

    #### WebSocket Events for Posts:
    ```typescript
    interface PostUpdate {
    type: 'POST_UPDATE' | 'POST_CREATE' | 'POST_DELETE' | 'POSTS_UPDATE';
    data: {
        posts?: Post[];  // For POSTS_UPDATE
        post?: Post;     // For POST_UPDATE/CREATE
        id?: string;     // For POST_DELETE
    }
    }
    ```


3. Media API
    #### GET /media
    Returns all media files.

    Response Structure:
    ```typescript
    interface MediaItem {
    id: number;
    filename: string;
    r2_key: string;
    content_type: string;
    mime_type: string;
    size: number;
    published: number;  // 0 or 1
    show_in_blog: number;
    show_in_pics: number;
    created_at: string;
    }
    ```

    #### GET /media/:key
    Returns the actual media file.

4. WebSocket Connection
    #### WebSocket Connection
    Connect to: `ws://[worker-url]/ws`

    The WebSocket handler sends a 'HELLO' message on connection and expects subscriptions for:
    - POSTS_UPDATE
    - POST_UPDATE
    - POST_CREATE
    - POST_DELETE
    - SITE_CONFIG_UPDATE

    Example connection:
    ```javascript
    const ws = new WebSocket('ws://[worker-url]/ws');
    ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch(data.type) {
        case 'SITE_CONFIG_UPDATE':
        // Handle site config update
        break;
        case 'POSTS_UPDATE':
        // Handle posts update
        break;
        // ... handle other events
    }
    };

5. Important Notes
    1. All boolean values in the database are stored as 0/1
    2. All timestamps are in ISO format
    3. CORS is enabled for all API endpoints
    4. Media files are stored in R2 buckets
    5. Post content supports both Markdown and HTML formats
    6. WebSocket connections should handle reconnection logic



    {
  title: "I like Margaritas",
  visible: 1,
  content: {
    text: "when made with passion"
  }
}

### About Sections Structure

The about page content is part of the site configuration and follows this structure:

```typescript
interface AboutSection {
    title: string;
    visible: number;  // 0 or 1
    content: {
        text: string;
    }
}

interface SiteConfig {
    // ... other config fields ...
    about_description: string | null;
    about_sections: AboutSection[];
}
```

Example response:
```json
{
    "siteConfig": {
        "about_description": "I travel. I laugh. I make people happy.",
        "about_sections": [
            {
                "title": "I like Margaritas",
                "visible": 1,
                "content": {
                    "text": "when made with passion"
                }
            },
            {
                "title": "And mai tais",
                "visible": 1,
                "content": {
                    "text": "when in maui"
                }
            }
        ]
    }
}
```

Implementation Notes:
1. About sections are delivered as an array of objects within the site configuration
2. Each section has a title, visibility flag, and nested content object
3. The content object contains a text field with the section's content
4. Sections should be displayed in the order they appear in the array
5. Visibility can be used to temporarily hide sections without deleting them