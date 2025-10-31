'use client';

import React, { useState, useEffect } from 'react';

interface WebflowInlineSetupProps {
  connectionId: number;
  userToken: string;
  websiteId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface WebflowSite {
  siteId: string;
  name: string;
  customDomain?: string;
  previewUrl?: string;
}

interface WebflowCollection {
  collectionId: string;
  name: string;
  slug: string;
  fields: WebflowField[];
  score: number;
}

interface WebflowField {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
}

interface FieldMapping {
  titleFieldId: string | null;
  slugFieldId: string | null;
  bodyFieldId: string | null;
  metaTitleFieldId: string | null;
  metaDescriptionFieldId: string | null;
  featuredImageFieldId: string | null;
}

type Step = 1 | 2 | 3 | 4;

export default function WebflowInlineSetup({
  connectionId,
  userToken,
  websiteId,
  onSuccess,
  onCancel,
}: WebflowInlineSetupProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Sites
  const [sites, setSites] = useState<WebflowSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSiteName, setSelectedSiteName] = useState<string>('');

  // Step 2: Collections
  const [collections, setCollections] = useState<WebflowCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>('');

  // Step 3: Field Mapping
  const [fields, setFields] = useState<WebflowField[]>([]);
  const [inferredMapping, setInferredMapping] = useState<FieldMapping | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    titleFieldId: null,
    slugFieldId: null,
    bodyFieldId: null,
    metaTitleFieldId: null,
    metaDescriptionFieldId: null,
    featuredImageFieldId: null,
  });

  // Step 4: Publish Behavior
  const [publishMode, setPublishMode] = useState<'draft' | 'auto_publish'>('draft');

  // Load sites on mount
  useEffect(() => {
    if (currentStep === 1) {
      loadSites();
    }
  }, [currentStep]);

  async function loadSites() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/cms/webflow/sites?userToken=${userToken}&connectionId=${connectionId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Webflow sites');
      }

      const data = await response.json();
      setSites(data.sites || []);

      // Auto-select first site if only one
      if (data.sites?.length === 1) {
        setSelectedSiteId(data.sites[0].siteId);
        setSelectedSiteName(data.sites[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  }

  async function loadCollections() {
    if (!selectedSiteId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/cms/webflow/collections?userToken=${userToken}&siteId=${selectedSiteId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      setCollections(data.collections || []);

      // Auto-select suggested collection
      if (data.suggestedCollectionId) {
        const suggestedCollection = data.collections.find(
          (c: WebflowCollection) => c.collectionId === data.suggestedCollectionId
        );
        if (suggestedCollection) {
          setSelectedCollectionId(suggestedCollection.collectionId);
          setSelectedCollectionName(suggestedCollection.name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }

  async function loadCollectionSchema() {
    if (!selectedCollectionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/cms/webflow/collection-schema?userToken=${userToken}&collectionId=${selectedCollectionId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collection schema');
      }

      const data = await response.json();
      console.log('[WEBFLOW FIELD MAPPING] Received fields from API:', data.fields);
      console.log('[WEBFLOW FIELD MAPPING] Field types summary:',
        data.fields?.reduce((acc: any, f: any) => {
          acc[f.type] = (acc[f.type] || 0) + 1;
          return acc;
        }, {})
      );
      console.log('[WEBFLOW FIELD MAPPING] Inferred mapping:', data.inferredMapping);

      setFields(data.fields || []);
      setInferredMapping(data.inferredMapping);

      // Set field mapping from inferred values
      if (data.inferredMapping) {
        setFieldMapping(data.inferredMapping);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection schema');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizeSetup() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cms/webflow/finalize-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          websiteId,
          connectionId,
          siteId: selectedSiteId,
          siteName: selectedSiteName,
          collectionId: selectedCollectionId,
          collectionName: selectedCollectionName,
          fieldMapping,
          publishMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to finalize setup');
      }

      // Success! Trigger callback
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    setError(null);

    if (currentStep === 1) {
      if (!selectedSiteId) {
        setError('Please select a site');
        return;
      }
      setCurrentStep(2);
      loadCollections();
    } else if (currentStep === 2) {
      if (!selectedCollectionId) {
        setError('Please select a collection');
        return;
      }
      setCurrentStep(3);
      loadCollectionSchema();
    } else if (currentStep === 3) {
      if (!fieldMapping.titleFieldId || !fieldMapping.slugFieldId || !fieldMapping.bodyFieldId) {
        console.error('[WEBFLOW FIELD MAPPING] Validation failed:', {
          titleFieldId: fieldMapping.titleFieldId,
          slugFieldId: fieldMapping.slugFieldId,
          bodyFieldId: fieldMapping.bodyFieldId,
          availableSlugFields: getFieldsByType('Slug').length,
          availablePlainTextFields: getFieldsByType('PlainText').length,
        });
        setError('Title, Slug, and Body fields are required');
        return;
      }
      console.log('[WEBFLOW FIELD MAPPING] Validation passed, proceeding to step 4');
      setCurrentStep(4);
    }
  }

  function handleBack() {
    setError(null);

    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    }
  }

  function getFieldsByType(type: string | string[]) {
    const types = Array.isArray(type) ? type : [type];
    const filtered = fields.filter(f => types.includes(f.type));
    console.log(`[WEBFLOW FIELD MAPPING] getFieldsByType(${JSON.stringify(type)}):`, filtered.map(f => `${f.name} (${f.type})`));
    return filtered;
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          1
        </div>
        <div className={`h-0.5 w-12 ${currentStep >= 2 ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          2
        </div>
        <div className={`h-0.5 w-12 ${currentStep >= 3 ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          3
        </div>
        <div className={`h-0.5 w-12 ${currentStep >= 4 ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 4 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          4
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Which Webflow site should we publish to?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We&apos;ll pull collections from this site so we can publish articles for you.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {sites.map((site) => (
            <div
              key={site.siteId}
              onClick={() => {
                setSelectedSiteId(site.siteId);
                setSelectedSiteName(site.name);
              }}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedSiteId === site.siteId
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">{site.name}</div>
              {site.customDomain && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {site.customDomain}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Where should blog posts live?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We found a Webflow Collection that looks like your blog.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Blog Posts Collection
          </label>
          <select
            value={selectedCollectionId || ''}
            onChange={(e) => {
              const collection = collections.find(c => c.collectionId === e.target.value);
              if (collection) {
                setSelectedCollectionId(collection.collectionId);
                setSelectedCollectionName(collection.name);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Select a collection...</option>
            {collections.map((collection) => (
              <option key={collection.collectionId} value={collection.collectionId}>
                {collection.name} (/{collection.slug})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          How we&apos;ll publish into Webflow
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We matched your fields automatically. You can edit if needed.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <select
              value={fieldMapping.titleFieldId || ''}
              onChange={(e) => setFieldMapping({ ...fieldMapping, titleFieldId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Select field...</option>
              {getFieldsByType(['PlainText', 'Name']).map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name} ({field.type})
                </option>
              ))}
            </select>
          </div>

          {/* Slug Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <select
              value={fieldMapping.slugFieldId || ''}
              onChange={(e) => setFieldMapping({ ...fieldMapping, slugFieldId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Select field...</option>
              {/* Prefer actual Slug type fields */}
              {getFieldsByType('Slug').map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name} (Slug field - recommended)
                </option>
              ))}
              {/* Fallback to PlainText if no Slug fields exist */}
              {getFieldsByType('Slug').length === 0 && getFieldsByType('PlainText').map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name} (PlainText - will be used as slug)
                </option>
              ))}
            </select>
            {getFieldsByType('Slug').length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ No Slug field type found in your collection. Using PlainText field as fallback. Consider adding a Slug field in Webflow for better URL handling.
              </p>
            )}
          </div>

          {/* Body Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body (Rich Text) <span className="text-red-500">*</span>
            </label>
            <select
              value={fieldMapping.bodyFieldId || ''}
              onChange={(e) => setFieldMapping({ ...fieldMapping, bodyFieldId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Select field...</option>
              {getFieldsByType('RichText').map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name} ({field.type})
                </option>
              ))}
            </select>
          </div>

          {/* Meta Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meta Title (Optional)
            </label>
            <select
              value={fieldMapping.metaTitleFieldId || ''}
              onChange={(e) => setFieldMapping({ ...fieldMapping, metaTitleFieldId: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Use Title</option>
              {getFieldsByType('PlainText').map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>

          {/* Meta Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meta Description (Optional)
            </label>
            <select
              value={fieldMapping.metaDescriptionFieldId || ''}
              onChange={(e) => setFieldMapping({ ...fieldMapping, metaDescriptionFieldId: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Auto-generate</option>
              {getFieldsByType(['PlainText', 'TextArea']).map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>

          {/* Featured Image Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Featured Image (Optional)
            </label>
            <select
              value={fieldMapping.featuredImageFieldId || ''}
              onChange={(e) => setFieldMapping({ ...fieldMapping, featuredImageFieldId: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">None</option>
              {getFieldsByType(['ImageRef', 'Image']).map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 pt-2">
            We&apos;ll create new posts as drafts in your Webflow CMS first. You can choose auto-publish next.
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Publishing workflow
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          How should new articles from SEOAgent appear in Webflow?
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <input
            type="radio"
            name="publishMode"
            value="draft"
            checked={publishMode === 'draft'}
            onChange={() => setPublishMode('draft')}
            className="mt-1"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Save as Draft in Webflow (recommended)
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              We&apos;ll create the post in your CMS as a draft. You can review and publish inside Webflow.
            </div>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <input
            type="radio"
            name="publishMode"
            value="auto_publish"
            checked={publishMode === 'auto_publish'}
            onChange={() => setPublishMode('auto_publish')}
            className="mt-1"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Publish Immediately
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              We&apos;ll publish new posts live on your site as soon as they&apos;re generated.
            </div>
          </div>
        </label>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Complete Webflow Setup
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Step {currentStep} of 4
        </p>
      </div>

      <div className="p-5">
        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-6 mt-6 border-t border-gray-100 dark:border-gray-700/60">
          <button
            type="button"
            onClick={currentStep === 1 ? onCancel : handleBack}
            disabled={loading}
            className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={currentStep === 4 ? handleFinalizeSetup : handleNext}
            disabled={loading}
            className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {currentStep === 4 ? 'Finishing...' : 'Loading...'}
              </>
            ) : (
              <>
                {currentStep === 4 ? 'Finish Setup' : 'Continue'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
