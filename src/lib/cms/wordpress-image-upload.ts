/**
 * WordPress Image Upload Utility
 *
 * Handles uploading temporary image URLs (OpenAI DALL-E, Azure Blob Storage, etc.)
 * to WordPress Media Library for both WordPress.com (OAuth) and self-hosted (Basic Auth)
 */

export interface WordPressImageUploadOptions {
  content: string;
  authType: 'bearer' | 'basic';
  accessToken: string; // OAuth token for WordPress.com OR application password for self-hosted
  siteUrl: string; // Full site URL (e.g., https://example.com or agathaworplesdon-ocast.wordpress.com)
  username?: string; // Required for Basic Auth (self-hosted)
}

export interface UploadedImageResult {
  originalUrl: string;
  wordpressUrl: string;
  mediaId: number;
}

/**
 * Upload images from temporary URLs to WordPress Media Library
 * Returns content with updated image URLs
 */
export async function uploadImagesToWordPress(options: WordPressImageUploadOptions): Promise<{
  content: string;
  uploadedImages: UploadedImageResult[];
}> {
  const { content, authType, accessToken, siteUrl, username } = options;

  // Find all image URLs in the content (especially OpenAI blob URLs)
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const matches: string[] = [];
  let match;

  // Use exec() loop for ES5 compatibility instead of matchAll()
  while ((match = imgRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }

  let updatedContent = content;
  const uploadedImages: UploadedImageResult[] = [];

  for (const imageUrl of matches) {
    // Only process temporary URLs (OpenAI, blob storage, etc.)
    if (
      imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') ||
      imageUrl.includes('blob.core.windows.net') ||
      imageUrl.includes('temp') ||
      imageUrl.includes('temporary')
    ) {
      try {
        console.log('[WORDPRESS IMAGE] Uploading image to Media Library:', imageUrl.substring(0, 80) + '...');

        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error('[WORDPRESS IMAGE] Failed to download image:', imageResponse.status);
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

        // Extract filename from URL or generate one
        const urlParts = imageUrl.split('/');
        const urlFilename = urlParts[urlParts.length - 1].split('?')[0];
        const extension = urlFilename.includes('.') ? urlFilename.split('.').pop() : 'png';
        const filename = urlFilename.includes('.') && urlFilename.length < 100
          ? urlFilename
          : `image-${Date.now()}.${extension}`;

        // Determine media endpoint based on auth type
        let mediaEndpoint: string;
        if (authType === 'bearer') {
          // WordPress.com OAuth
          mediaEndpoint = `https://public-api.wordpress.com/wp/v2/sites/${siteUrl}/media`;
        } else {
          // Self-hosted WordPress Basic Auth
          const cleanUrl = siteUrl.replace(/\/$/, '');
          mediaEndpoint = `${cleanUrl}/wp-json/wp/v2/media`;
        }

        console.log('[WORDPRESS IMAGE] Uploading to:', mediaEndpoint);

        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', new Blob([imageBuffer]), filename);

        // Prepare request headers
        const headers: Record<string, string> = {};
        if (authType === 'bearer') {
          headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
          // Basic Auth for self-hosted WordPress
          if (!username) {
            throw new Error('Username required for Basic Auth');
          }
          const auth = btoa(`${username}:${accessToken}`);
          headers['Authorization'] = `Basic ${auth}`;
        }

        // Upload to WordPress Media Library
        const uploadResponse = await fetch(mediaEndpoint, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('[WORDPRESS IMAGE] Media upload failed:', uploadResponse.status, errorText);
          continue;
        }

        const mediaData = await uploadResponse.json();
        const wordpressImageUrl = mediaData.source_url || mediaData.url;
        const mediaId = mediaData.id;

        if (wordpressImageUrl) {
          console.log('[WORDPRESS IMAGE] Successfully uploaded image:', {
            originalUrl: imageUrl.substring(0, 60) + '...',
            wordpressUrl: wordpressImageUrl.substring(0, 60) + '...',
            mediaId
          });

          // Replace the temporary URL with the permanent WordPress URL
          updatedContent = updatedContent.replace(imageUrl, wordpressImageUrl);

          uploadedImages.push({
            originalUrl: imageUrl,
            wordpressUrl: wordpressImageUrl,
            mediaId
          });
        }
      } catch (uploadError) {
        console.error('[WORDPRESS IMAGE] Image upload error:', uploadError);
        // Continue with next image on error
      }
    }
  }

  console.log(`[WORDPRESS IMAGE] Completed: ${uploadedImages.length}/${matches.length} images uploaded`);

  return {
    content: updatedContent,
    uploadedImages
  };
}

/**
 * Check if content contains temporary image URLs that need to be uploaded
 */
export function hasTemporaryImages(content: string): boolean {
  return (
    content.includes('oaidalleapiprodscus.blob.core.windows.net') ||
    content.includes('blob.core.windows.net') ||
    /src="[^"]*temp[^"]*"/i.test(content) ||
    /src="[^"]*temporary[^"]*"/i.test(content)
  );
}
