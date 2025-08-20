import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BusinessDetectionRequest {
  websiteUrl: string;
  websiteToken?: string;
  userToken?: string;
}

interface BusinessDetectionResult {
  businessType: 'local' | 'online' | 'hybrid' | 'unknown';
  confidence: number; // 0-100
  detectedSignals: DetectionSignal[];
  suggestedInfo: BusinessInfo;
  recommendedSchemaType: string;
}

interface DetectionSignal {
  type: 'contact' | 'hours' | 'location' | 'service' | 'business';
  pattern: string;
  matches: string[];
  confidence: number;
  category?: string;
}

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  hours?: string;
  serviceArea?: string;
  businessCategory?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl, websiteToken, userToken }: BusinessDetectionRequest = await request.json();

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    // Clean and validate URL
    let cleanUrl: string;
    try {
      const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      cleanUrl = url.origin;
    } catch {
      return NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 });
    }

    console.log(`[BUSINESS DETECTION] Analyzing ${cleanUrl} for local business signals`);

    // Fetch website content
    const websiteContent = await fetchWebsiteContent(cleanUrl);
    if (!websiteContent) {
      return NextResponse.json({ error: 'Could not fetch website content' }, { status: 400 });
    }

    // Get detection patterns from database (with fallback to hardcoded patterns)
    let patterns: any[] = [];
    
    try {
      const { data: dbPatterns, error: patternsError } = await supabase
        .from('business_detection_patterns')
        .select('*')
        .eq('is_active', true);

      if (!patternsError && dbPatterns) {
        patterns = dbPatterns;
      } else {
        console.log('[BUSINESS DETECTION] Using fallback patterns (database not available)');
        patterns = getFallbackPatterns();
      }
    } catch (error) {
      console.log('[BUSINESS DETECTION] Database error, using fallback patterns');
      patterns = getFallbackPatterns();
    }

    // Analyze content for business signals
    const detectionResult = analyzeBusinessSignals(websiteContent, patterns);

    // Get recommended schema type
    const schemaType = await getRecommendedSchemaType(detectionResult.detectedSignals);

    // Store detection results if we have website/user tokens
    if (websiteToken && userToken) {
      await storeDetectionResults(websiteToken, userToken, detectionResult);
    }

    console.log(`[BUSINESS DETECTION] Completed analysis for ${cleanUrl} - Type: ${detectionResult.businessType}, Confidence: ${detectionResult.confidence}%`);

    return NextResponse.json({
      success: true,
      data: {
        ...detectionResult,
        recommendedSchemaType: schemaType,
        websiteUrl: cleanUrl
      }
    });

  } catch (error) {
    console.error('[BUSINESS DETECTION] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEOAgent-Business-Detector/1.0 (+https://seoagent.com/business-detection)'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[BUSINESS DETECTION] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();
    
    // Extract text content from HTML (basic approach)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return textContent;

  } catch (error) {
    console.error('[BUSINESS DETECTION] Error fetching content:', error);
    return null;
  }
}

function analyzeBusinessSignals(content: string, patterns: any[]): BusinessDetectionResult {
  const detectedSignals: DetectionSignal[] = [];
  let totalConfidence = 0;
  const businessInfo: BusinessInfo = {};
  const categoryScores: Record<string, number> = {};

  // Apply each pattern to the content
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.pattern_regex, 'gi');
    const keywordMatches = findKeywordMatches(content, pattern.pattern_keywords);
    const regexMatches = findRegexMatches(content, regex);

    if (keywordMatches.length > 0 || regexMatches.length > 0) {
      const allMatches = [...keywordMatches, ...regexMatches];
      const confidence = Math.min(pattern.confidence_weight * Math.log(allMatches.length + 1), pattern.confidence_weight * 2);

      detectedSignals.push({
        type: pattern.pattern_type,
        pattern: pattern.description || pattern.pattern_regex,
        matches: allMatches.slice(0, 3), // Limit to first 3 matches
        confidence: Math.round(confidence),
        category: pattern.business_category
      });

      totalConfidence += confidence;
      
      // Track category scores
      if (pattern.business_category) {
        categoryScores[pattern.business_category] = (categoryScores[pattern.business_category] || 0) + confidence;
      }

      // Extract specific business info
      extractBusinessInfo(pattern.pattern_type, allMatches, businessInfo);
    }
  }

  // Determine business type based on signals
  const businessType = determineBusinessType(detectedSignals, totalConfidence);
  
  // Normalize confidence to 0-100 scale
  const normalizedConfidence = Math.min(Math.round(totalConfidence * 1.5), 100);

  // Set the most likely business category
  const topCategory = Object.entries(categoryScores).sort(([,a], [,b]) => b - a)[0];
  if (topCategory) {
    businessInfo.businessCategory = topCategory[0];
  }

  return {
    businessType,
    confidence: normalizedConfidence,
    detectedSignals,
    suggestedInfo: businessInfo,
    recommendedSchemaType: 'LocalBusiness' // Will be determined by getRecommendedSchemaType
  };
}

function findKeywordMatches(content: string, keywords: string[]): string[] {
  if (!keywords) return [];
  
  const matches: string[] = [];
  const lowerContent = content.toLowerCase();
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (lowerContent.includes(keywordLower)) {
      // Find the actual context around the keyword
      const index = lowerContent.indexOf(keywordLower);
      const start = Math.max(0, index - 20);
      const end = Math.min(content.length, index + keyword.length + 20);
      matches.push(content.substring(start, end).trim());
    }
  }
  
  return matches;
}

function findRegexMatches(content: string, regex: RegExp): string[] {
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null && matches.length < 5) {
    matches.push(match[0]);
  }
  
  return matches;
}

function extractBusinessInfo(patternType: string, matches: string[], businessInfo: BusinessInfo) {
  switch (patternType) {
    case 'contact':
      // Extract phone numbers
      const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
      const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)/i;
      
      for (const match of matches) {
        if (phoneRegex.test(match) && !businessInfo.phone) {
          businessInfo.phone = match.match(phoneRegex)?.[0] || '';
        }
        if (addressRegex.test(match) && !businessInfo.address) {
          businessInfo.address = match.match(addressRegex)?.[0] || '';
        }
      }
      break;
      
    case 'hours':
      if (!businessInfo.hours && matches.length > 0) {
        businessInfo.hours = matches[0];
      }
      break;
      
    case 'location':
      if (!businessInfo.serviceArea && matches.length > 0) {
        businessInfo.serviceArea = matches[0];
      }
      break;
  }
}

function determineBusinessType(signals: DetectionSignal[], confidence: number): 'local' | 'online' | 'hybrid' | 'unknown' {
  if (confidence < 20) {
    return 'unknown';
  }

  const hasLocalSignals = signals.some(s => ['contact', 'hours', 'location'].includes(s.type));
  const hasServiceSignals = signals.some(s => s.type === 'service');
  
  if (hasLocalSignals && confidence > 50) {
    return hasServiceSignals ? 'hybrid' : 'local';
  }
  
  if (hasServiceSignals && confidence > 30) {
    return 'hybrid';
  }
  
  return confidence > 40 ? 'local' : 'unknown';
}

async function getRecommendedSchemaType(signals: DetectionSignal[]): Promise<string> {
  try {
    // Get schema type mappings
    const { data: schemaTypes } = await supabase
      .from('business_schema_types')
      .select('*')
      .order('priority_score', { ascending: false });

    if (!schemaTypes?.length) {
      return 'LocalBusiness';
    }

    // Find the best matching schema type based on detected categories
    const categorySignals = signals.filter(s => s.category);
    
    for (const signal of categorySignals) {
      const matchingType = schemaTypes.find(st => st.business_category === signal.category);
      if (matchingType) {
        return matchingType.schema_type;
      }
    }

    // Default to LocalBusiness for local signals
    return 'LocalBusiness';

  } catch (error) {
    console.error('[BUSINESS DETECTION] Error getting schema type:', error);
    return 'LocalBusiness';
  }
}

async function storeDetectionResults(
  websiteToken: string, 
  userToken: string, 
  result: BusinessDetectionResult
) {
  try {
    await supabase
      .from('websites')
      .update({
        business_type: result.businessType,
        business_detection_confidence: result.confidence,
        business_detection_signals: result.detectedSignals,
        business_info: result.suggestedInfo,
        business_updated_at: new Date().toISOString()
      })
      .eq('website_token', websiteToken)
      .eq('user_token', userToken);

    console.log(`[BUSINESS DETECTION] Stored results for website ${websiteToken}`);

  } catch (error) {
    console.error('[BUSINESS DETECTION] Error storing results:', error);
  }
}

function getFallbackPatterns(): any[] {
  return [
    // Address patterns - more precise
    {
      pattern_type: 'contact',
      pattern_regex: '\\d{1,5}\\s+[A-Za-z\\s]+(?:Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Boulevard|Blvd\\.?|Drive|Dr\\.?|Lane|Ln\\.?|Way|Circle|Cir\\.?|Court|Ct\\.?|Place|Pl\\.?)(?:\\s|,|$)',
      pattern_keywords: ['address', 'located at', 'visit us at', 'find us at', 'our address'],
      confidence_weight: 30,
      business_category: 'local',
      description: 'Physical address detection'
    },
    
    // Phone patterns - more specific
    {
      pattern_type: 'contact',
      pattern_regex: '(?:call|phone|tel:?|telephone).*?\\(?\\d{3}\\)?[-\\s\\.]?\\d{3}[-\\s\\.]?\\d{4}|\\(?\\d{3}\\)?[-\\s\\.]?\\d{3}[-\\s\\.]?\\d{4}(?=\\s|$|[^\\d])',
      pattern_keywords: ['phone', 'call us', 'telephone', 'contact us', 'tel:', 'call now'],
      confidence_weight: 25,
      business_category: 'local',
      description: 'Phone number patterns'
    },

    // Business hours patterns
    {
      pattern_type: 'hours',
      pattern_regex: '(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun).*?(?:\\d{1,2}:\\d{2}|\\d{1,2}(?:am|pm))',
      pattern_keywords: ['hours', 'open', 'closed', 'business hours', 'store hours'],
      confidence_weight: 30,
      business_category: 'local',
      description: 'Business hours detection'
    },

    // 24/7 patterns
    {
      pattern_type: 'hours',
      pattern_regex: 'open\\s+(?:24/7|24\\s+hours|daily)',
      pattern_keywords: ['24/7', '24 hours', 'always open'],
      confidence_weight: 25,
      business_category: 'local',
      description: '24/7 business hours'
    },

    // Service area patterns
    {
      pattern_type: 'location',
      pattern_regex: '\\b(?:serving|service area|we serve|located in|based in)\\s+[A-Za-z\\s,]+',
      pattern_keywords: ['serving', 'service area', 'local service'],
      confidence_weight: 20,
      business_category: 'service',
      description: 'Service area mentions'
    },

    // ZIP code patterns
    {
      pattern_type: 'location',
      pattern_regex: '\\b[A-Za-z\\s]+(?:,\\s*[A-Z]{2}|\\s+[A-Z]{2})\\s+\\d{5}(?:-\\d{4})?\\b',
      pattern_keywords: ['zip code', 'postal code'],
      confidence_weight: 15,
      business_category: 'local',
      description: 'ZIP code patterns'
    },

    // Appointment patterns
    {
      pattern_type: 'service',
      pattern_regex: '\\b(?:book|schedule|appointment|reservation|call to schedule|book now|schedule online)\\b',
      pattern_keywords: ['appointment', 'booking', 'schedule', 'reservation'],
      confidence_weight: 25,
      business_category: 'service',
      description: 'Appointment-based business'
    },

    // Emergency service patterns
    {
      pattern_type: 'service',
      pattern_regex: '\\b(?:emergency|24.*hour.*emergency|on.*call|after.*hours)\\b',
      pattern_keywords: ['emergency', 'urgent', 'on-call'],
      confidence_weight: 20,
      business_category: 'emergency_service',
      description: 'Emergency service indicators'
    },

    // Local business heritage
    {
      pattern_type: 'business',
      pattern_regex: '\\b(?:family.*owned|locally.*owned|established.*\\d{4}|since.*\\d{4}|generations?|community)\\b',
      pattern_keywords: ['family owned', 'local', 'established', 'community'],
      confidence_weight: 15,
      business_category: 'local',
      description: 'Local business heritage indicators'
    },

    // Physical location indicators
    {
      pattern_type: 'business',
      pattern_regex: '\\b(?:showroom|warehouse|storefront|retail.*location|brick.*mortar)\\b',
      pattern_keywords: ['showroom', 'physical location', 'retail'],
      confidence_weight: 20,
      business_category: 'retail',
      description: 'Physical location indicators'
    }
  ];
}