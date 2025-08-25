'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import Image from 'next/image'

type WebsiteBuildingMethod = 'custom' | 'shopify' | 'wix' | 'squarespace' | 'wordpress' | 'webflow' | 'lovable' | 'replit' | 'github_pages' | 'other' | ''
type CMSType = 'none' | 'strapi' | 'contentful' | 'sanity' | 'ghost' | 'wordpress' | 'directus' | 'other' | ''
type HostingProvider = 'vercel' | 'netlify' | 'aws' | 'google_cloud' | 'github_pages' | 'cloudflare_pages' | 'digitalocean' | 'heroku' | 'railway' | 'render' | 'other' | ''

interface SurveyData {
  websiteBuildingMethod: WebsiteBuildingMethod
  websiteBuildingMethodOther: string
  usesCms: boolean
  cmsType: CMSType
  cmsTypeOther: string
  hostingProvider: HostingProvider
  hostingProviderOther: string
  businessType: string
  websiteAge: string
  monthlyVisitors: string
  seoExperience: string
  primarySeoGoal: string
  interestedInFounderCall: boolean
  acceptedProOffer: boolean
}

interface OnboardingSurveyProps {
  onComplete: (surveyData: SurveyData) => void
  onSkip?: () => void
  mandatory?: boolean
}

export default function OnboardingSurvey({ onComplete, onSkip, mandatory = false }: OnboardingSurveyProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  
  const [surveyData, setSurveyData] = useState<SurveyData>({
    websiteBuildingMethod: '',
    websiteBuildingMethodOther: '',
    usesCms: false,
    cmsType: '',
    cmsTypeOther: '',
    hostingProvider: '',
    hostingProviderOther: '',
    businessType: '',
    websiteAge: '',
    monthlyVisitors: '',
    seoExperience: '',
    primarySeoGoal: '',
    interestedInFounderCall: false,
    acceptedProOffer: false
  })

  const buildingMethods = [
    { value: 'custom', label: 'Custom HTML/CSS/JS' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'wix', label: 'Wix' },
    { value: 'squarespace', label: 'Squarespace' },
    { value: 'wordpress', label: 'WordPress' },
    { value: 'webflow', label: 'Webflow' },
    { value: 'lovable', label: 'Lovable' },
    { value: 'replit', label: 'Replit' },
    { value: 'github_pages', label: 'GitHub Pages' },
    { value: 'other', label: 'Other' }
  ]

  const cmsOptions = [
    { value: 'none', label: 'No CMS' },
    { value: 'strapi', label: 'Strapi' },
    { value: 'contentful', label: 'Contentful' },
    { value: 'sanity', label: 'Sanity' },
    { value: 'ghost', label: 'Ghost' },
    { value: 'wordpress', label: 'WordPress' },
    { value: 'directus', label: 'Directus' },
    { value: 'other', label: 'Other' }
  ]

  const hostingOptions = [
    { value: 'vercel', label: 'Vercel' },
    { value: 'netlify', label: 'Netlify' },
    { value: 'aws', label: 'AWS' },
    { value: 'google_cloud', label: 'Google Cloud' },
    { value: 'github_pages', label: 'GitHub Pages' },
    { value: 'cloudflare_pages', label: 'Cloudflare Pages' },
    { value: 'digitalocean', label: 'DigitalOcean' },
    { value: 'heroku', label: 'Heroku' },
    { value: 'railway', label: 'Railway' },
    { value: 'render', label: 'Render' },
    { value: 'other', label: 'Other' }
  ]

  const businessTypes = [
    'E-commerce',
    'Blog/Content Site',
    'Portfolio',
    'SaaS Product',
    'Local Business',
    'Agency/Services',
    'Non-profit',
    'Other'
  ]

  const websiteAges = [
    'Less than 1 month',
    '1-6 months',
    '6-12 months',
    'Over 1 year'
  ]

  const visitorRanges = [
    'Less than 1,000/month',
    '1,000-10,000/month',
    '10,000-50,000/month',
    'Over 50,000/month',
    'Not sure'
  ]

  const seoExperienceLevels = [
    'Complete beginner',
    'Some experience',
    'Intermediate',
    'Advanced'
  ]

  const handleNext = () => {
    setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      onComplete(surveyData)
    } catch (error) {
      console.error('Error submitting survey:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSurveyData = (updates: Partial<SurveyData>) => {
    setSurveyData(prev => ({ ...prev, ...updates }))
  }

  // Determine if CMS questions should be shown based on building method
  const shouldShowCMSQuestions = () => {
    const methodsWithoutCMS = ['shopify', 'wix', 'squarespace']
    return !methodsWithoutCMS.includes(surveyData.websiteBuildingMethod as string)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                How did you build your website?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This helps us understand your setup and provide better recommendations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {buildingMethods.map(method => (
                <button
                  key={method.value}
                  onClick={() => updateSurveyData({ websiteBuildingMethod: method.value as WebsiteBuildingMethod })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    surveyData.websiteBuildingMethod === method.value
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="font-medium">{method.label}</div>
                </button>
              ))}
            </div>

            {surveyData.websiteBuildingMethod === 'other' as WebsiteBuildingMethod && (
              <input
                type="text"
                placeholder="Please specify..."
                value={surveyData.websiteBuildingMethodOther}
                onChange={(e) => updateSurveyData({ websiteBuildingMethodOther: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {shouldShowCMSQuestions() 
                  ? 'Do you use a Content Management System (CMS)?'
                  : 'What hosting provider do you use?'
                }
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {shouldShowCMSQuestions()
                  ? 'A CMS helps you manage your content and blog posts.'
                  : 'This helps us understand your infrastructure setup.'
                }
              </p>
            </div>

            {shouldShowCMSQuestions() ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cmsOptions.map(cms => (
                  <button
                    key={cms.value}
                    onClick={() => updateSurveyData({ cmsType: cms.value as CMSType, usesCms: cms.value !== 'none' })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      surveyData.cmsType === cms.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{cms.label}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hostingOptions.map(host => (
                  <button
                    key={host.value}
                    onClick={() => updateSurveyData({ hostingProvider: host.value as HostingProvider })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      surveyData.hostingProvider === host.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{host.label}</div>
                  </button>
                ))}
              </div>
            )}

            {((shouldShowCMSQuestions() && surveyData.cmsType === 'other' as CMSType) || 
              (!shouldShowCMSQuestions() && surveyData.hostingProvider === 'other' as HostingProvider)) && (
              <input
                type="text"
                placeholder="Please specify..."
                value={shouldShowCMSQuestions() ? surveyData.cmsTypeOther : surveyData.hostingProviderOther}
                onChange={(e) => shouldShowCMSQuestions() 
                  ? updateSurveyData({ cmsTypeOther: e.target.value })
                  : updateSurveyData({ hostingProviderOther: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            )}
          </div>
        )

      case 3:
        // Show hosting if we showed CMS in step 2, or show business context
        if (shouldShowCMSQuestions() && !surveyData.hostingProvider) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  What hosting provider do you use?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  This helps us understand your infrastructure setup.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hostingOptions.map(host => (
                  <button
                    key={host.value}
                    onClick={() => updateSurveyData({ hostingProvider: host.value as HostingProvider })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      surveyData.hostingProvider === host.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{host.label}</div>
                  </button>
                ))}
              </div>

              {surveyData.hostingProvider === 'other' as HostingProvider && (
                <input
                  type="text"
                  placeholder="Please specify..."
                  value={surveyData.hostingProviderOther}
                  onChange={(e) => updateSurveyData({ hostingProviderOther: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>
          )
        } else {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Tell us about your website
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  This helps us provide more targeted SEO recommendations.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What type of business/website is this?
                  </label>
                  <select
                    value={surveyData.businessType}
                    onChange={(e) => updateSurveyData({ businessType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select business type...</option>
                    {businessTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    How old is your website?
                  </label>
                  <select
                    value={surveyData.websiteAge}
                    onChange={(e) => updateSurveyData({ websiteAge: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select age...</option>
                    {websiteAges.map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Roughly how many visitors do you get per month?
                  </label>
                  <select
                    value={surveyData.monthlyVisitors}
                    onChange={(e) => updateSurveyData({ monthlyVisitors: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select range...</option>
                    {visitorRanges.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        }

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What&apos;s your SEO experience level?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This helps us tailor our recommendations and interface.
              </p>
            </div>
            
            <div className="space-y-3">
              {seoExperienceLevels.map(level => (
                <button
                  key={level}
                  onClick={() => updateSurveyData({ seoExperience: level })}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    surveyData.seoExperience === level
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="font-medium">{level}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What&apos;s your primary SEO goal? (Optional)
              </label>
              <textarea
                value={surveyData.primarySeoGoal}
                onChange={(e) => updateSurveyData({ primarySeoGoal: e.target.value })}
                placeholder="e.g., Increase organic traffic, improve local search visibility, rank for specific keywords..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Special Founder&apos;s Offer!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get 3 months of SEOAgent Pro absolutely free in exchange for a 15-minute onboarding call with our founder.
              </p>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">What you&apos;ll get:</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  3 months of SEOAgent Pro ($237 value)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Personalized SEO strategy session
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Direct access to our founder for questions
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Priority support during your free months
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={surveyData.interestedInFounderCall}
                  onChange={(e) => updateSurveyData({ 
                    interestedInFounderCall: e.target.checked,
                    acceptedProOffer: e.target.checked
                  })}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Yes, I&apos;d like to book a 15-minute call with the founder and get 3 months of SEOAgent Pro free! 
                  I understand this helps improve the product and I&apos;ll receive valuable personalized SEO insights.
                </span>
              </label>

              {surveyData.interestedInFounderCall && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Perfect! After completing this survey, you&apos;ll be redirected to book your call.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Your Pro account will be activated immediately after your call is confirmed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return surveyData.websiteBuildingMethod && 
          (surveyData.websiteBuildingMethod !== ('other' as WebsiteBuildingMethod) || surveyData.websiteBuildingMethodOther.trim())
      case 2:
        if (shouldShowCMSQuestions()) {
          return surveyData.cmsType && 
            (surveyData.cmsType !== ('other' as CMSType) || surveyData.cmsTypeOther.trim())
        } else {
          return surveyData.hostingProvider && 
            (surveyData.hostingProvider !== ('other' as HostingProvider) || surveyData.hostingProviderOther.trim())
        }
      case 3:
        if (shouldShowCMSQuestions() && !surveyData.hostingProvider) {
          return surveyData.hostingProvider && 
            (surveyData.hostingProvider !== ('other' as HostingProvider) || surveyData.hostingProviderOther.trim())
        } else {
          return surveyData.businessType && surveyData.websiteAge && surveyData.monthlyVisitors
        }
      case 4:
        return surveyData.seoExperience
      case 5:
        return true // Optional step
      default:
        return false
    }
  }

  const maxSteps = 5

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center">
            <Image 
              src="/assets/agent_icon.png" 
              alt="SEOAgent" 
              width={64}
              height={64}
              style={{ height: '64px', width: '64px' }}
            />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Step {currentStep} of {maxSteps}</span>
            <span>{Math.round((currentStep / maxSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / maxSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg sm:rounded-lg sm:px-10">
          {renderStepContent()}

          <div className="mt-8 flex justify-between">
            <button
              onClick={currentStep === 1 && !mandatory ? onSkip : handlePrevious}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              disabled={loading || (currentStep === 1 && mandatory)}
              style={{ 
                visibility: currentStep === 1 && mandatory ? 'hidden' : 'visible' 
              }}
            >
              {currentStep === 1 && !mandatory ? 'Skip Survey' : 'Previous'}
            </button>

            {currentStep < maxSteps ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid() || loading}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Completing...' : 'Complete Survey'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}