"use strict";
/**
 * Image Generation Service
 *
 * Handles image generation for articles using:
 * - OpenAI Images (gpt-image-1)
 * - Stability AI (Stable Diffusion)
 * - Unsplash (stock photo fallback)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationService = void 0;
class ImageGenerationService {
    constructor() { }
    /**
     * Generate images for an article
     */
    async generateImagesForArticle(params) {
        const { title, outline, numImages, provider, imageStyle } = params;
        const prompts = this.buildImagePromptsFromOutline(title, outline, numImages, imageStyle);
        const images = [];
        if (provider === 'openai' && process.env.OPENAI_API_KEY) {
            return await this.generateOpenAIImages(prompts);
        }
        else if (provider === 'stability' && process.env.STABILITY_API_KEY) {
            return await this.generateStabilityImages(prompts);
        }
        else if (process.env.UNSPLASH_ACCESS_KEY) {
            return await this.fetchUnsplashImages(prompts);
        }
        return images;
    }
    /**
     * Generate images using OpenAI gpt-image-1
     */
    async generateOpenAIImages(prompts) {
        var _a, _b;
        const images = [];
        for (const p of prompts) {
            try {
                console.log('[IMAGE SERVICE] Generating OpenAI image:', p.alt);
                const response = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-image-1',
                        prompt: p.prompt,
                        size: '1024x1024',
                        quality: 'standard',
                        n: 1
                    }),
                    signal: AbortSignal.timeout(25000)
                });
                if (response.ok) {
                    const data = await response.json();
                    const url = (_b = (_a = data === null || data === void 0 ? void 0 : data.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url;
                    if (url) {
                        images.push({
                            url,
                            alt: p.alt,
                            provider: 'openai'
                        });
                    }
                }
                else {
                    console.log('[IMAGE SERVICE] OpenAI API error:', response.status, await response.text());
                }
            }
            catch (error) {
                console.log('[IMAGE SERVICE] OpenAI generation failed:', error);
            }
        }
        return images;
    }
    /**
     * Generate images using Stability AI
     */
    async generateStabilityImages(prompts) {
        var _a, _b;
        const images = [];
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
                    signal: AbortSignal.timeout(25000)
                });
                if (response.ok) {
                    const data = await response.json();
                    const base64 = (_b = (_a = data === null || data === void 0 ? void 0 : data.artifacts) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.base64;
                    if (base64) {
                        // Note: In production, you'd upload this to your storage service
                        // For now, we'll return the data URL
                        images.push({
                            url: `data:image/png;base64,${base64}`,
                            alt: p.alt,
                            provider: 'stability'
                        });
                    }
                }
                else {
                    console.log('[IMAGE SERVICE] Stability API error:', response.status, await response.text());
                }
            }
            catch (error) {
                console.log('[IMAGE SERVICE] Stability generation failed:', error);
            }
        }
        return images;
    }
    /**
     * Fetch images from Unsplash
     */
    async fetchUnsplashImages(prompts) {
        var _a, _b, _c;
        const images = [];
        for (const p of prompts) {
            try {
                console.log('[IMAGE SERVICE] Fetching Unsplash image:', p.alt);
                const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(p.alt)}&per_page=1&orientation=landscape`, {
                    headers: {
                        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
                    },
                    signal: AbortSignal.timeout(12000)
                });
                if (response.ok) {
                    const data = await response.json();
                    const img = (_a = data === null || data === void 0 ? void 0 : data.results) === null || _a === void 0 ? void 0 : _a[0];
                    if ((_b = img === null || img === void 0 ? void 0 : img.urls) === null || _b === void 0 ? void 0 : _b.regular) {
                        images.push({
                            url: img.urls.regular,
                            alt: p.alt,
                            provider: 'unsplash',
                            attribution: ((_c = img.user) === null || _c === void 0 ? void 0 : _c.name) ? `Photo by ${img.user.name} on Unsplash` : 'Unsplash'
                        });
                    }
                }
                else {
                    console.log('[IMAGE SERVICE] Unsplash API error:', response.status, await response.text());
                }
            }
            catch (error) {
                console.log('[IMAGE SERVICE] Unsplash fetch failed:', error);
            }
        }
        return images;
    }
    /**
     * Build image prompts from article outline
     */
    buildImagePromptsFromOutline(title, outline, numImages, style) {
        const sections = Array.isArray(outline)
            ? outline
            : ((outline === null || outline === void 0 ? void 0 : outline.mainSections) || []);
        const picks = sections.slice(0, Math.max(1, Math.min(numImages, sections.length || 1)));
        return picks.map((s, idx) => ({
            prompt: `High-quality web illustration for an article titled "${title}". Section: "${s.title || s}". Style: ${style}. No text, no watermarks, professional web design.`,
            alt: `${s.title || title} illustration`
        }));
    }
    /**
     * Inject images into HTML content
     */
    injectImagesIntoHtml(html, images) {
        if (!images.length)
            return html;
        // Insert first image after TL;DR box
        const firstFig = `<figure><img src="${images[0].url}" alt="${this.escapeHtml(images[0].alt)}" loading="lazy" /><figcaption>${this.escapeHtml(images[0].alt)}</figcaption></figure>`;
        let output = html.replace(/<\/div>\s*<!--\s*TLDR_END\s*-->|<\/div>\s*<\/div>|<\/div>/i, match => `${match}\n${firstFig}`);
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
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
exports.ImageGenerationService = ImageGenerationService;
