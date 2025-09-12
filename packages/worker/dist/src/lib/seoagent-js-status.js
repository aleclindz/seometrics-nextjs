"use strict";
/**
 * SEOAgent.js Status Checker
 * Determines if seoagent.js is active for a given website
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmartJSStatus = getSmartJSStatus;
exports.getMultipleSmartJSStatus = getMultipleSmartJSStatus;
/**
 * Check if seoagent.js should be considered active for a website
 * This includes both sites with the script installed and the SEOAgent app itself
 */
function getSmartJSStatus(websiteUrl) {
    try {
        // Normalize the URL
        const url = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        // SEOAgent domains - we know seoagent.js is installed
        const seoAgentDomains = [
            'seoagent.com',
            'www.seoagent.com',
            'translateyoutubevideos.com',
            'www.translateyoutubevideos.com',
            'localhost:3001',
            'localhost:3000'
        ];
        // Check if this is a SEOAgent domain
        if (seoAgentDomains.some(domain => url.includes(domain))) {
            return 'active';
        }
        // For other domains, default to inactive (can be enhanced later with real checking)
        return 'inactive';
    }
    catch (error) {
        console.error('[SEOAGENT.JS STATUS] Error checking status for', websiteUrl, ':', error);
        return 'error';
    }
}
/**
 * Check seoagent.js status for multiple websites
 */
function getMultipleSmartJSStatus(websites) {
    const statusMap = new Map();
    websites.forEach(website => {
        const status = getSmartJSStatus(website.url);
        statusMap.set(website.id, status);
    });
    return statusMap;
}
