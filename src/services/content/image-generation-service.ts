/**
 * Image Generation Service
 * 
 * Handles image generation for articles using:
 * - OpenAI Images (gpt-image-1)
 * - Stability AI (Stable Diffusion)  
 * - Unsplash (stock photo fallback)
 */

export type GeneratedImage = {
  url: string;
  alt: string;
  provider: string;
  attribution?: string;
};

export type ImageProvider = 'openai' | 'stability' | 'unsplash';

export class ImageGenerationService {
  constructor() {}

  /**
   * Generate images for an article
   */
  async generateImagesForArticle(params: {
    title: string;
    outline: any;
    numImages: number;
    provider: ImageProvider;
    imageStyle: string;
  }): Promise<GeneratedImage[]> {
    const { title, outline, numImages, provider, imageStyle } = params;
    
    const prompts = this.buildImagePromptsFromOutline(title, outline, numImages, imageStyle);
    const images: GeneratedImage[] = [];

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      return await this.generateOpenAIImages(prompts);
    } else if (provider === 'stability' && process.env.STABILITY_API_KEY) {
      return await this.generateStabilityImages(prompts);
    } else if (process.env.UNSPLASH_ACCESS_KEY) {
      return await this.fetchUnsplashImages(prompts);
    }

    return images;
  }

  /**
   * Generate images using OpenAI DALL-E 3
   * Cost: $0.04 per 1024x1024 image (vs $0.40 for gpt-image-1)
   */
  private async generateOpenAIImages(prompts: Array<{ prompt: string; alt: string }>): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    for (const p of prompts) {
      try {
        console.log('[IMAGE SERVICE] Generating OpenAI image:', p.alt);

        // Simple retry: 2 attempts with short backoff
        let lastErr: any = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt: p.prompt,
                size: '1024x1024',
                quality: 'standard', // DALL-E 3 supports 'standard' or 'hd'
                n: 1
              }),
              signal: AbortSignal.timeout(45000)
            });

            if (response.ok) {
              const data = await response.json();
              const url = data?.data?.[0]?.url;
              if (url) {
                images.push({ url, alt: p.alt, provider: 'openai' });
              }
              lastErr = null;
              break;
            } else {
              const txt = await response.text();
              lastErr = new Error(`OpenAI API error ${response.status}: ${txt}`);
              console.log('[IMAGE SERVICE] OpenAI API error:', response.status, txt);
            }
          } catch (e) {
            lastErr = e;
            console.log(`[IMAGE SERVICE] OpenAI generation attempt ${attempt} failed:`, e);
          }
          // Backoff 1s before next attempt
          await new Promise(r => setTimeout(r, 1000));
        }
        if (lastErr) {
          console.log('[IMAGE SERVICE] OpenAI generation failed after retries:', lastErr);
        }
      } catch (error) {
        console.log('[IMAGE SERVICE] OpenAI generation failed:', error);
      }
    }

    return images;
  }

  /**
   * Generate images using Stability AI
   */
  private async generateStabilityImages(prompts: Array<{ prompt: string; alt: string }>): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    for (const p of prompts) {
      try {
        console.log('[IMAGE SERVICE] Generating Stability image:', p.alt);
        
        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text_prompts: [{ text: p.prompt }],
            width: 1024,
            height: 1024,
            cfg_scale: 7,
            samples: 1,
            steps: 30
          }),
          signal: AbortSignal.timeout(45000)
        });

        if (response.ok) {
          const data = await response.json();
          const base64 = data?.artifacts?.[0]?.base64;
          if (base64) {
            // Note: In production, you'd upload this to your storage service
            // For now, we'll return the data URL
            images.push({
              url: `data:image/png;base64,${base64}`,
              alt: p.alt,
              provider: 'stability'
            });
          }
        } else {
          console.log('[IMAGE SERVICE] Stability API error:', response.status, await response.text());
        }
      } catch (error) {
        console.log('[IMAGE SERVICE] Stability generation failed:', error);
      }
    }

    return images;
  }

  /**
   * Fetch images from Unsplash
   */
  private async fetchUnsplashImages(prompts: Array<{ prompt: string; alt: string }>): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    for (const p of prompts) {
      try {
        console.log('[IMAGE SERVICE] Fetching Unsplash image:', p.alt);
        
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(p.alt)}&per_page=1&orientation=landscape`,
          {
            headers: { 
              'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` 
            },
            signal: AbortSignal.timeout(12000)
          }
        );

        if (response.ok) {
          const data = await response.json();
          const img = data?.results?.[0];
          if (img?.urls?.regular) {
            images.push({
              url: img.urls.regular,
              alt: p.alt,
              provider: 'unsplash',
              attribution: img.user?.name ? `Photo by ${img.user.name} on Unsplash` : 'Unsplash'
            });
          }
        } else {
          console.log('[IMAGE SERVICE] Unsplash API error:', response.status, await response.text());
        }
      } catch (error) {
        console.log('[IMAGE SERVICE] Unsplash fetch failed:', error);
      }
    }

    return images;
  }

  /**
   * Build image prompts from article outline
   */
  private buildImagePromptsFromOutline(
    title: string, 
    outline: any, 
    numImages: number, 
    style: string
  ): Array<{ prompt: string; alt: string }> {
    const sections = Array.isArray(outline) 
      ? outline 
      : (outline?.mainSections || []);
    
    const picks = sections.slice(0, Math.max(1, Math.min(numImages, sections.length || 1)));
    
    return picks.map((s: any, idx: number) => ({
      prompt: `High-quality web illustration for an article titled "${title}". Section: "${s.title || s}". Style: ${style}. No text, no watermarks, professional web design.`,
      alt: `${s.title || title} illustration`
    }));
  }

  /**
   * Inject images into HTML content
   */
  injectImagesIntoHtml(html: string, images: GeneratedImage[]): string {
    if (!images.length) return html;
    
    // Insert first image after TL;DR box
    const firstFig = `<figure><img src="${images[0].url}" alt="${this.escapeHtml(images[0].alt)}" loading="lazy" /><figcaption>${this.escapeHtml(images[0].alt)}</figcaption></figure>`;
    let output = html.replace(
      /<\/div>\s*<!--\s*TLDR_END\s*-->|<\/div>\s*<\/div>|<\/div>/i, 
      match => `${match}\n${firstFig}`
    );

    // Insert remaining images after H2 sections
    for (let i = 1; i < images.length; i++) {
      const fig = `<figure><img src="${images[i].url}" alt="${this.escapeHtml(images[i].alt)}" loading="lazy" /><figcaption>${this.escapeHtml(images[i].alt)}</figcaption></figure>`;
      output = output.replace(/<h2[^>]*>/, (match) => `${match}\n${fig}\n`);
    }

    return output;
  }

  /**
   * Escape HTML for safe injection
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
