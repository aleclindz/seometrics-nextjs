/**
 * Test Fixtures for Master Discovery System
 *
 * These fixtures represent three different business types:
 * - Example A: B2B SaaS (MetricPilot - product analytics)
 * - Example B: Local Business (SunCo Citrus - South Florida lemon importer)
 * - Example C: E-commerce/DTC (PeakRoast - coffee roaster)
 *
 * Each fixture demonstrates proper structure:
 * - 4-10 secondaries per PILLAR
 * - 0-5 secondaries per SUPPORTING
 * - SUPPORTING articles link to PILLARs
 * - Section mapping for each PILLAR
 * - Changes log documenting cannibalization prevention
 */

import { MasterDiscoveryInput, MasterDiscoveryOutput } from '../master-discovery';

// ============================================================================
// EXAMPLE A: B2B SaaS (MetricPilot - Product Analytics)
// ============================================================================

export const saasInput: MasterDiscoveryInput = {
  site: {
    brand: 'MetricPilot',
    domain: 'metricpilot.com',
    geo_focus: ['United States', 'United Kingdom', 'Canada'],
    seed_topics: [
      'product analytics',
      'user behavior tracking',
      'conversion optimization',
      'A/B testing',
      'customer journey analytics'
    ]
  },
  sources: {
    seed_urls: [
      'https://metricpilot.com',
      'https://metricpilot.com/features',
      'https://metricpilot.com/blog'
    ],
    raw_owner_context: 'B2B SaaS product analytics platform for mid-market companies. Focused on helping product teams make data-driven decisions.'
  },
  controls: {
    max_clusters: 8,
    min_clusters: 5,
    map_sections: true,
    include_local_slices: false
  }
};

export const saasOutput: MasterDiscoveryOutput = {
  clusters: [
    {
      pillar_title: 'Product Analytics Fundamentals',
      primary_keyword: 'product analytics',
      secondary_keywords: [
        'product analytics tools',
        'product analytics software',
        'what is product analytics',
        'product analytics metrics'
      ],
      notes: 'Core product analytics concepts and tools'
    },
    {
      pillar_title: 'User Behavior Tracking',
      primary_keyword: 'user behavior tracking',
      secondary_keywords: [
        'track user behavior',
        'user behavior analytics',
        'session recording',
        'heatmap tracking'
      ],
      notes: 'Methods and tools for tracking user interactions'
    },
    {
      pillar_title: 'Conversion Optimization',
      primary_keyword: 'conversion optimization',
      secondary_keywords: [
        'conversion rate optimization',
        'optimize conversions',
        'conversion funnel analysis',
        'CRO strategies'
      ],
      notes: 'Strategies for improving conversion rates'
    },
    {
      pillar_title: 'A/B Testing & Experimentation',
      primary_keyword: 'a/b testing',
      secondary_keywords: [
        'a/b testing tools',
        'split testing',
        'multivariate testing',
        'experimentation platform'
      ],
      notes: 'Testing methodologies and platforms'
    },
    {
      pillar_title: 'Customer Journey Analytics',
      primary_keyword: 'customer journey analytics',
      secondary_keywords: [
        'customer journey mapping',
        'user journey tracking',
        'touchpoint analysis',
        'journey optimization'
      ],
      notes: 'Understanding and optimizing customer paths'
    }
  ],
  articles: [
    {
      id: 'pill_product_analytics',
      role: 'PILLAR',
      title: 'Product Analytics: The Complete Guide for Product Teams',
      primary_keyword: 'product analytics',
      secondary_keywords: [
        'product analytics tools',
        'product analytics software',
        'what is product analytics',
        'product analytics metrics',
        'product analytics platform',
        'best product analytics tools'
      ],
      cluster: 'Product Analytics Fundamentals',
      section_map: [
        {
          type: 'H2',
          heading: 'What is Product Analytics?',
          absorbs: ['what is product analytics', 'product analytics platform']
        },
        {
          type: 'H2',
          heading: 'Essential Product Analytics Metrics',
          absorbs: ['product analytics metrics']
        },
        {
          type: 'H2',
          heading: 'Top Product Analytics Tools Compared',
          absorbs: ['product analytics tools', 'product analytics software', 'best product analytics tools']
        }
      ]
    },
    {
      id: 'supp_product_analytics_b2b',
      role: 'SUPPORTING',
      title: 'Product Analytics for B2B SaaS: Key Differences',
      primary_keyword: 'product analytics for b2b',
      secondary_keywords: ['b2b product analytics', 'saas analytics'],
      cluster: 'Product Analytics Fundamentals',
      links_to: ['pill_product_analytics']
    },
    {
      id: 'supp_product_analytics_pricing',
      role: 'SUPPORTING',
      title: 'Product Analytics Pricing: What to Expect in 2025',
      primary_keyword: 'product analytics pricing',
      secondary_keywords: ['analytics tool costs'],
      cluster: 'Product Analytics Fundamentals',
      links_to: ['pill_product_analytics']
    },
    {
      id: 'pill_user_behavior',
      role: 'PILLAR',
      title: 'User Behavior Tracking: Methods, Tools & Best Practices',
      primary_keyword: 'user behavior tracking',
      secondary_keywords: [
        'track user behavior',
        'user behavior analytics',
        'session recording',
        'heatmap tracking',
        'user tracking tools'
      ],
      cluster: 'User Behavior Tracking',
      section_map: [
        {
          type: 'H2',
          heading: 'How to Track User Behavior on Your Website',
          absorbs: ['track user behavior', 'user tracking tools']
        },
        {
          type: 'H2',
          heading: 'User Behavior Analytics Explained',
          absorbs: ['user behavior analytics']
        },
        {
          type: 'H2',
          heading: 'Session Recording vs Heatmaps',
          absorbs: ['session recording', 'heatmap tracking']
        }
      ]
    },
    {
      id: 'supp_session_recording',
      role: 'SUPPORTING',
      title: 'Session Recording Best Practices for Privacy Compliance',
      primary_keyword: 'session recording privacy',
      secondary_keywords: ['gdpr session recording', 'privacy compliant tracking'],
      cluster: 'User Behavior Tracking',
      links_to: ['pill_user_behavior']
    },
    {
      id: 'pill_conversion_optimization',
      role: 'PILLAR',
      title: 'Conversion Optimization: The Complete CRO Guide',
      primary_keyword: 'conversion optimization',
      secondary_keywords: [
        'conversion rate optimization',
        'optimize conversions',
        'conversion funnel analysis',
        'CRO strategies',
        'conversion optimization techniques'
      ],
      cluster: 'Conversion Optimization',
      section_map: [
        {
          type: 'H2',
          heading: 'What is Conversion Rate Optimization (CRO)?',
          absorbs: ['conversion rate optimization', 'optimize conversions']
        },
        {
          type: 'H2',
          heading: 'Conversion Funnel Analysis Step-by-Step',
          absorbs: ['conversion funnel analysis']
        },
        {
          type: 'H2',
          heading: 'Proven CRO Strategies That Work',
          absorbs: ['CRO strategies', 'conversion optimization techniques']
        }
      ]
    },
    {
      id: 'supp_ecommerce_cro',
      role: 'SUPPORTING',
      title: 'E-commerce Conversion Optimization Tactics',
      primary_keyword: 'ecommerce conversion optimization',
      secondary_keywords: ['online store cro', 'ecommerce cro tactics'],
      cluster: 'Conversion Optimization',
      links_to: ['pill_conversion_optimization']
    },
    {
      id: 'pill_ab_testing',
      role: 'PILLAR',
      title: 'A/B Testing Guide: How to Run Successful Experiments',
      primary_keyword: 'a/b testing',
      secondary_keywords: [
        'a/b testing tools',
        'split testing',
        'multivariate testing',
        'experimentation platform',
        'how to do a/b testing'
      ],
      cluster: 'A/B Testing & Experimentation',
      section_map: [
        {
          type: 'H2',
          heading: 'A/B Testing vs Split Testing vs Multivariate Testing',
          absorbs: ['split testing', 'multivariate testing']
        },
        {
          type: 'H2',
          heading: 'How to Run A/B Tests Step-by-Step',
          absorbs: ['how to do a/b testing']
        },
        {
          type: 'H2',
          heading: 'Best A/B Testing Tools & Experimentation Platforms',
          absorbs: ['a/b testing tools', 'experimentation platform']
        }
      ]
    },
    {
      id: 'supp_ab_test_sample_size',
      role: 'SUPPORTING',
      title: 'A/B Test Sample Size Calculator & Statistical Significance',
      primary_keyword: 'ab test sample size',
      secondary_keywords: ['statistical significance ab testing'],
      cluster: 'A/B Testing & Experimentation',
      links_to: ['pill_ab_testing']
    },
    {
      id: 'pill_customer_journey',
      role: 'PILLAR',
      title: 'Customer Journey Analytics: Mapping & Optimization Guide',
      primary_keyword: 'customer journey analytics',
      secondary_keywords: [
        'customer journey mapping',
        'user journey tracking',
        'touchpoint analysis',
        'journey optimization',
        'customer journey tools'
      ],
      cluster: 'Customer Journey Analytics',
      section_map: [
        {
          type: 'H2',
          heading: 'Customer Journey Mapping Fundamentals',
          absorbs: ['customer journey mapping', 'user journey tracking']
        },
        {
          type: 'H2',
          heading: 'Touchpoint Analysis & Attribution',
          absorbs: ['touchpoint analysis']
        },
        {
          type: 'H2',
          heading: 'Journey Optimization Strategies',
          absorbs: ['journey optimization', 'customer journey tools']
        }
      ]
    }
  ],
  changes: [
    'Separated "product analytics tools" into pillar section to avoid cannibalization with "best product analytics tools"',
    'Moved "b2b product analytics" to supporting article to prevent keyword overlap with main pillar',
    'Split conversion optimization into pillar + ecommerce-specific supporting article',
    'Consolidated session recording and heatmaps into pillar with dedicated sections'
  ]
};

// ============================================================================
// EXAMPLE B: Local Business (SunCo Citrus - South Florida Lemon Importer)
// ============================================================================

export const localBusinessInput: MasterDiscoveryInput = {
  site: {
    brand: 'SunCo Citrus',
    domain: 'suncocitrus.com',
    geo_focus: ['South Florida', 'Miami', 'Fort Lauderdale'],
    seed_topics: [
      'fresh lemons',
      'citrus import',
      'wholesale citrus',
      'restaurant citrus supplier'
    ]
  },
  sources: {
    seed_urls: ['https://suncocitrus.com'],
    raw_owner_context: 'Import and distribute fresh lemons to restaurants and grocery stores in South Florida'
  },
  controls: {
    max_clusters: 6,
    min_clusters: 5,
    map_sections: true,
    include_local_slices: true
  }
};

export const localBusinessOutput: MasterDiscoveryOutput = {
  clusters: [
    {
      pillar_title: 'Fresh Lemon Imports',
      primary_keyword: 'fresh lemons florida',
      secondary_keywords: [
        'buy fresh lemons miami',
        'fresh lemon supplier',
        'imported lemons south florida'
      ],
      notes: 'Core lemon import and supply in South Florida'
    },
    {
      pillar_title: 'Wholesale Citrus Supply',
      primary_keyword: 'wholesale citrus supplier',
      secondary_keywords: [
        'bulk citrus florida',
        'wholesale lemons miami',
        'citrus distributor south florida'
      ],
      notes: 'B2B wholesale citrus services'
    },
    {
      pillar_title: 'Restaurant Citrus Services',
      primary_keyword: 'restaurant lemon supplier',
      secondary_keywords: [
        'citrus for restaurants',
        'commercial citrus delivery',
        'restaurant citrus miami'
      ],
      notes: 'Restaurant-specific citrus supply'
    },
    {
      pillar_title: 'Citrus Quality & Storage',
      primary_keyword: 'fresh lemon storage',
      secondary_keywords: [
        'how to store lemons',
        'lemon freshness tips',
        'citrus quality standards'
      ],
      notes: 'Educational content on citrus quality'
    },
    {
      pillar_title: 'Lemon Varieties & Uses',
      primary_keyword: 'types of lemons',
      secondary_keywords: [
        'lemon varieties',
        'best lemons for cooking',
        'meyer lemons vs regular lemons'
      ],
      notes: 'Lemon variety education'
    }
  ],
  articles: [
    {
      id: 'pill_fresh_lemons_fl',
      role: 'PILLAR',
      title: 'Fresh Lemons in South Florida: Your Complete Supplier Guide',
      primary_keyword: 'fresh lemons florida',
      secondary_keywords: [
        'buy fresh lemons miami',
        'fresh lemon supplier',
        'imported lemons south florida',
        'fresh lemons fort lauderdale'
      ],
      cluster: 'Fresh Lemon Imports',
      section_map: [
        {
          type: 'H2',
          heading: 'Where to Buy Fresh Lemons in Miami',
          absorbs: ['buy fresh lemons miami']
        },
        {
          type: 'H2',
          heading: 'Choosing a Fresh Lemon Supplier',
          absorbs: ['fresh lemon supplier', 'imported lemons south florida']
        },
        {
          type: 'FAQ',
          heading: 'Where can I buy fresh lemons in Fort Lauderdale?',
          absorbs: ['fresh lemons fort lauderdale']
        }
      ]
    },
    {
      id: 'supp_lemon_import_process',
      role: 'SUPPORTING',
      title: 'How We Import Fresh Lemons to South Florida',
      primary_keyword: 'lemon import process',
      secondary_keywords: [],
      cluster: 'Fresh Lemon Imports',
      links_to: ['pill_fresh_lemons_fl']
    },
    {
      id: 'pill_wholesale_citrus',
      role: 'PILLAR',
      title: 'Wholesale Citrus Supplier in South Florida | Bulk Orders',
      primary_keyword: 'wholesale citrus supplier',
      secondary_keywords: [
        'bulk citrus florida',
        'wholesale lemons miami',
        'citrus distributor south florida',
        'bulk lemon orders'
      ],
      cluster: 'Wholesale Citrus Supply',
      section_map: [
        {
          type: 'H2',
          heading: 'Bulk Citrus Orders in Florida',
          absorbs: ['bulk citrus florida', 'bulk lemon orders']
        },
        {
          type: 'H2',
          heading: 'Wholesale Lemons Miami Delivery',
          absorbs: ['wholesale lemons miami', 'citrus distributor south florida']
        }
      ]
    },
    {
      id: 'supp_wholesale_pricing',
      role: 'SUPPORTING',
      title: 'Wholesale Citrus Pricing Guide for South Florida Businesses',
      primary_keyword: 'wholesale citrus pricing',
      secondary_keywords: ['bulk lemon prices'],
      cluster: 'Wholesale Citrus Supply',
      links_to: ['pill_wholesale_citrus']
    },
    {
      id: 'pill_restaurant_supplier',
      role: 'PILLAR',
      title: 'Restaurant Lemon Supplier in Miami | Commercial Citrus Delivery',
      primary_keyword: 'restaurant lemon supplier',
      secondary_keywords: [
        'citrus for restaurants',
        'commercial citrus delivery',
        'restaurant citrus miami',
        'restaurant citrus supplier south florida'
      ],
      cluster: 'Restaurant Citrus Services',
      section_map: [
        {
          type: 'H2',
          heading: 'Commercial Citrus Delivery Services',
          absorbs: ['commercial citrus delivery', 'citrus for restaurants']
        },
        {
          type: 'H2',
          heading: 'Restaurant Citrus Supply in Miami & South Florida',
          absorbs: ['restaurant citrus miami', 'restaurant citrus supplier south florida']
        }
      ]
    },
    {
      id: 'supp_restaurant_contracts',
      role: 'SUPPORTING',
      title: 'Restaurant Citrus Supply Contracts: What to Look For',
      primary_keyword: 'restaurant citrus contracts',
      secondary_keywords: [],
      cluster: 'Restaurant Citrus Services',
      links_to: ['pill_restaurant_supplier']
    },
    {
      id: 'pill_lemon_storage',
      role: 'PILLAR',
      title: 'Fresh Lemon Storage: How to Keep Lemons Fresh Longer',
      primary_keyword: 'fresh lemon storage',
      secondary_keywords: [
        'how to store lemons',
        'lemon freshness tips',
        'citrus quality standards',
        'keep lemons fresh'
      ],
      cluster: 'Citrus Quality & Storage',
      section_map: [
        {
          type: 'H2',
          heading: 'How to Store Lemons Properly',
          absorbs: ['how to store lemons', 'keep lemons fresh']
        },
        {
          type: 'H2',
          heading: 'Lemon Freshness Tips for Restaurants',
          absorbs: ['lemon freshness tips']
        },
        {
          type: 'FAQ',
          heading: 'What are citrus quality standards?',
          absorbs: ['citrus quality standards']
        }
      ]
    },
    {
      id: 'pill_lemon_varieties',
      role: 'PILLAR',
      title: 'Types of Lemons: Complete Guide to Lemon Varieties',
      primary_keyword: 'types of lemons',
      secondary_keywords: [
        'lemon varieties',
        'best lemons for cooking',
        'meyer lemons vs regular lemons',
        'eureka lemons vs lisbon lemons'
      ],
      cluster: 'Lemon Varieties & Uses',
      section_map: [
        {
          type: 'H2',
          heading: 'Popular Lemon Varieties Explained',
          absorbs: ['lemon varieties']
        },
        {
          type: 'H2',
          heading: 'Best Lemons for Cooking & Restaurants',
          absorbs: ['best lemons for cooking']
        },
        {
          type: 'FAQ',
          heading: 'What&apos;s the difference between Meyer lemons and regular lemons?',
          absorbs: ['meyer lemons vs regular lemons', 'eureka lemons vs lisbon lemons']
        }
      ]
    }
  ],
  changes: [
    'Added local geo-modifiers (Miami, Fort Lauderdale) to prevent generic national results',
    'Split wholesale and restaurant supplier into separate pillars for clearer targeting',
    'Created supporting articles for pricing/contracts to avoid commercial keyword overlap with service pages'
  ]
};

// ============================================================================
// EXAMPLE C: E-commerce/DTC (PeakRoast - Coffee Roaster)
// ============================================================================

export const ecommerceInput: MasterDiscoveryInput = {
  site: {
    brand: 'PeakRoast',
    domain: 'peakroast.com',
    geo_focus: ['United States'],
    seed_topics: [
      'specialty coffee',
      'coffee roasting',
      'coffee beans',
      'brewing methods',
      'coffee subscriptions'
    ]
  },
  sources: {
    seed_urls: [
      'https://peakroast.com',
      'https://peakroast.com/collections/coffee',
      'https://peakroast.com/pages/brewing-guide'
    ],
    raw_owner_context: 'Direct-to-consumer specialty coffee roaster offering single-origin beans and coffee subscriptions'
  },
  controls: {
    max_clusters: 8,
    min_clusters: 5,
    map_sections: true,
    include_local_slices: false
  }
};

export const ecommerceOutput: MasterDiscoveryOutput = {
  clusters: [
    {
      pillar_title: 'Specialty Coffee Basics',
      primary_keyword: 'specialty coffee',
      secondary_keywords: [
        'what is specialty coffee',
        'specialty coffee beans',
        'specialty vs regular coffee',
        'specialty coffee guide'
      ],
      notes: 'Introduction to specialty coffee'
    },
    {
      pillar_title: 'Coffee Roasting',
      primary_keyword: 'coffee roasting',
      secondary_keywords: [
        'how to roast coffee',
        'coffee roasting process',
        'light vs dark roast',
        'coffee roast levels'
      ],
      notes: 'Coffee roasting education'
    },
    {
      pillar_title: 'Coffee Bean Selection',
      primary_keyword: 'coffee beans',
      secondary_keywords: [
        'best coffee beans',
        'single origin coffee',
        'arabica vs robusta',
        'coffee bean types'
      ],
      notes: 'Bean selection and origins'
    },
    {
      pillar_title: 'Coffee Brewing Methods',
      primary_keyword: 'coffee brewing methods',
      secondary_keywords: [
        'how to brew coffee',
        'pour over coffee',
        'french press coffee',
        'espresso brewing'
      ],
      notes: 'Brewing techniques and equipment'
    },
    {
      pillar_title: 'Coffee Subscriptions',
      primary_keyword: 'coffee subscription',
      secondary_keywords: [
        'monthly coffee subscription',
        'coffee delivery service',
        'best coffee subscriptions',
        'coffee subscription box'
      ],
      notes: 'Subscription services and benefits'
    }
  ],
  articles: [
    {
      id: 'pill_specialty_coffee',
      role: 'PILLAR',
      title: 'Specialty Coffee Guide: What Makes Coffee "Specialty"?',
      primary_keyword: 'specialty coffee',
      secondary_keywords: [
        'what is specialty coffee',
        'specialty coffee beans',
        'specialty vs regular coffee',
        'specialty coffee guide',
        'specialty grade coffee'
      ],
      cluster: 'Specialty Coffee Basics',
      section_map: [
        {
          type: 'H2',
          heading: 'What is Specialty Coffee?',
          absorbs: ['what is specialty coffee', 'specialty grade coffee']
        },
        {
          type: 'H2',
          heading: 'Specialty vs Regular Coffee: Key Differences',
          absorbs: ['specialty vs regular coffee']
        },
        {
          type: 'H2',
          heading: 'How to Choose Specialty Coffee Beans',
          absorbs: ['specialty coffee beans', 'specialty coffee guide']
        }
      ]
    },
    {
      id: 'supp_specialty_coffee_score',
      role: 'SUPPORTING',
      title: 'Specialty Coffee Scoring: The 100-Point Scale Explained',
      primary_keyword: 'specialty coffee scoring',
      secondary_keywords: ['coffee cupping scores'],
      cluster: 'Specialty Coffee Basics',
      links_to: ['pill_specialty_coffee']
    },
    {
      id: 'pill_coffee_roasting',
      role: 'PILLAR',
      title: 'Coffee Roasting 101: The Complete Guide to Roast Levels',
      primary_keyword: 'coffee roasting',
      secondary_keywords: [
        'how to roast coffee',
        'coffee roasting process',
        'light vs dark roast',
        'coffee roast levels',
        'home coffee roasting'
      ],
      cluster: 'Coffee Roasting',
      section_map: [
        {
          type: 'H2',
          heading: 'The Coffee Roasting Process Step-by-Step',
          absorbs: ['coffee roasting process', 'how to roast coffee']
        },
        {
          type: 'H2',
          heading: 'Coffee Roast Levels: Light vs Medium vs Dark',
          absorbs: ['coffee roast levels', 'light vs dark roast']
        },
        {
          type: 'FAQ',
          heading: 'Can I roast coffee at home?',
          absorbs: ['home coffee roasting']
        }
      ]
    },
    {
      id: 'supp_first_crack_second_crack',
      role: 'SUPPORTING',
      title: 'First Crack vs Second Crack in Coffee Roasting',
      primary_keyword: 'first crack coffee',
      secondary_keywords: ['second crack coffee', 'coffee roasting stages'],
      cluster: 'Coffee Roasting',
      links_to: ['pill_coffee_roasting']
    },
    {
      id: 'pill_coffee_beans',
      role: 'PILLAR',
      title: 'Coffee Beans Guide: Types, Origins & How to Choose',
      primary_keyword: 'coffee beans',
      secondary_keywords: [
        'best coffee beans',
        'single origin coffee',
        'arabica vs robusta',
        'coffee bean types',
        'where to buy coffee beans'
      ],
      cluster: 'Coffee Bean Selection',
      section_map: [
        {
          type: 'H2',
          heading: 'Coffee Bean Types: Arabica vs Robusta',
          absorbs: ['coffee bean types', 'arabica vs robusta']
        },
        {
          type: 'H2',
          heading: 'Single Origin Coffee Explained',
          absorbs: ['single origin coffee']
        },
        {
          type: 'H2',
          heading: 'Best Coffee Beans for Home Brewing',
          absorbs: ['best coffee beans', 'where to buy coffee beans']
        }
      ]
    },
    {
      id: 'supp_ethiopian_coffee',
      role: 'SUPPORTING',
      title: 'Ethiopian Coffee: The Birthplace of Coffee',
      primary_keyword: 'ethiopian coffee',
      secondary_keywords: ['ethiopian coffee beans', 'yirgacheffe coffee'],
      cluster: 'Coffee Bean Selection',
      links_to: ['pill_coffee_beans']
    },
    {
      id: 'supp_colombian_coffee',
      role: 'SUPPORTING',
      title: 'Colombian Coffee: Why It&apos;s World-Famous',
      primary_keyword: 'colombian coffee',
      secondary_keywords: ['colombian coffee beans'],
      cluster: 'Coffee Bean Selection',
      links_to: ['pill_coffee_beans']
    },
    {
      id: 'pill_brewing_methods',
      role: 'PILLAR',
      title: 'Coffee Brewing Methods: Complete Guide to Making Great Coffee',
      primary_keyword: 'coffee brewing methods',
      secondary_keywords: [
        'how to brew coffee',
        'pour over coffee',
        'french press coffee',
        'espresso brewing',
        'cold brew coffee'
      ],
      cluster: 'Coffee Brewing Methods',
      section_map: [
        {
          type: 'H2',
          heading: 'How to Brew Coffee: The Basics',
          absorbs: ['how to brew coffee']
        },
        {
          type: 'H2',
          heading: 'Pour Over Coffee Technique',
          absorbs: ['pour over coffee']
        },
        {
          type: 'H2',
          heading: 'French Press vs Espresso vs Cold Brew',
          absorbs: ['french press coffee', 'espresso brewing', 'cold brew coffee']
        }
      ]
    },
    {
      id: 'supp_aeropress_guide',
      role: 'SUPPORTING',
      title: 'AeroPress Coffee: The Ultimate Brewing Guide',
      primary_keyword: 'aeropress coffee',
      secondary_keywords: ['how to use aeropress'],
      cluster: 'Coffee Brewing Methods',
      links_to: ['pill_brewing_methods']
    },
    {
      id: 'supp_chemex_guide',
      role: 'SUPPORTING',
      title: 'Chemex Coffee: Step-by-Step Brewing Instructions',
      primary_keyword: 'chemex coffee',
      secondary_keywords: ['how to use chemex'],
      cluster: 'Coffee Brewing Methods',
      links_to: ['pill_brewing_methods']
    },
    {
      id: 'pill_coffee_subscription',
      role: 'PILLAR',
      title: 'Coffee Subscription Guide: Best Monthly Coffee Delivery Services',
      primary_keyword: 'coffee subscription',
      secondary_keywords: [
        'monthly coffee subscription',
        'coffee delivery service',
        'best coffee subscriptions',
        'coffee subscription box',
        'coffee club subscription'
      ],
      cluster: 'Coffee Subscriptions',
      section_map: [
        {
          type: 'H2',
          heading: 'How Coffee Subscriptions Work',
          absorbs: ['monthly coffee subscription', 'coffee club subscription']
        },
        {
          type: 'H2',
          heading: 'Best Coffee Subscription Services Compared',
          absorbs: ['best coffee subscriptions', 'coffee delivery service']
        },
        {
          type: 'FAQ',
          heading: 'What comes in a coffee subscription box?',
          absorbs: ['coffee subscription box']
        }
      ]
    },
    {
      id: 'supp_coffee_subscription_gifts',
      role: 'SUPPORTING',
      title: 'Coffee Subscription Gift Guide: Perfect for Coffee Lovers',
      primary_keyword: 'coffee subscription gift',
      secondary_keywords: ['gift coffee subscription'],
      cluster: 'Coffee Subscriptions',
      links_to: ['pill_coffee_subscription']
    }
  ],
  changes: [
    'Split origin-specific content (Ethiopian, Colombian) into supporting articles to avoid cannibalization with general bean guide',
    'Separated brewing methods (AeroPress, Chemex) into supporting articles since they target specific equipment brands',
    'Consolidated specialty coffee scoring into supporting article to keep pillar focused on basics',
    'Added "coffee subscription gift" as supporting to capture gift-giving intent separately from regular subscriptions'
  ]
};

// ============================================================================
// All Fixtures Export
// ============================================================================

export const allFixtures = {
  saas: {
    input: saasInput,
    output: saasOutput
  },
  localBusiness: {
    input: localBusinessInput,
    output: localBusinessOutput
  },
  ecommerce: {
    input: ecommerceInput,
    output: ecommerceOutput
  }
};
