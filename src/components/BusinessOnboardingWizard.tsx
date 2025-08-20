'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Phone, Clock, Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  hours?: string;
  serviceArea?: string;
  businessCategory?: string;
  website?: string;
  businessType?: 'local' | 'online' | 'hybrid';
}

interface DetectionResult {
  businessType: 'local' | 'online' | 'hybrid' | 'unknown';
  confidence: number;
  detectedSignals: any[];
  suggestedInfo: BusinessInfo;
  recommendedSchemaType: string;
}

interface BusinessOnboardingWizardProps {
  websiteUrl?: string;
  websiteToken?: string;
  userToken?: string;
  onComplete?: (businessInfo: BusinessInfo) => void;
  onSkip?: () => void;
}

export default function BusinessOnboardingWizard({
  websiteUrl = '',
  websiteToken,
  userToken,
  onComplete,
  onSkip
}: BusinessOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [websiteInput, setWebsiteInput] = useState(websiteUrl);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleDetectBusiness = async () => {
    if (!websiteInput.trim()) {
      alert('Please enter a website URL');
      return;
    }

    setIsDetecting(true);
    try {
      const response = await fetch('/api/business/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: websiteInput,
          websiteToken,
          userToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to detect business type');
      }

      const data = await response.json();
      setDetectionResult(data.data);
      
      // Pre-fill form with detected information
      setBusinessInfo({
        ...data.data.suggestedInfo,
        website: websiteInput,
        businessType: data.data.businessType
      });

      setCurrentStep(2);
    } catch (error) {
      console.error('Business detection error:', error);
      alert('Failed to analyze website. You can still manually configure your business type.');
      setCurrentStep(2);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleManualSetup = () => {
    setBusinessInfo({
      website: websiteInput,
      businessType: 'unknown'
    });
    setCurrentStep(2);
  };

  const handleBusinessTypeSelect = (type: 'local' | 'online' | 'hybrid') => {
    setBusinessInfo({
      ...businessInfo,
      businessType: type
    });
    setCurrentStep(3);
  };

  const handleSaveBusiness = async () => {
    if (!userToken) {
      alert('User token is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/business/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteToken,
          userToken,
          businessInfo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save business information');
      }

      const result = await response.json();
      console.log('Business info saved successfully:', result);
      
      onComplete?.(businessInfo);
    } catch (error) {
      console.error('Error saving business info:', error);
      alert(error instanceof Error ? error.message : 'Failed to save business information');
    } finally {
      setIsSaving(false);
    }
  };

  const updateBusinessInfo = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-600 bg-green-50';
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getBusinessTypeIcon = (type?: string) => {
    switch (type) {
      case 'local':
        return <MapPin className="h-5 w-5" />;
      case 'online':
        return <Zap className="h-5 w-5" />;
      case 'hybrid':
        return <Building2 className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Business Setup Wizard
          </CardTitle>
          <CardDescription>
            Help us understand your business type to generate the best SEO schema markup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  disabled={isDetecting}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleDetectBusiness}
                  disabled={isDetecting || !websiteInput.trim()}
                  className="flex-1"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Website...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Auto-Detect Business Type
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={handleManualSetup}>
                  Manual Setup
                </Button>
              </div>

              <div className="text-center">
                <button
                  onClick={onSkip}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {detectionResult && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Detection Results</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          We analyzed your website and found signals indicating this is likely a{' '}
                          <span className="font-medium">{detectionResult.businessType}</span> business
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(detectionResult.confidence)}`}>
                        {detectionResult.confidence}% confident
                      </span>
                    </div>

                    {detectionResult.detectedSignals.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Detected signals:</p>
                        <div className="flex flex-wrap gap-2">
                          {detectionResult.detectedSignals.slice(0, 3).map((signal, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {signal.pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="text-lg font-medium mb-4">What type of business is this?</h3>
                <div className="grid gap-4">
                  <Card 
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => handleBusinessTypeSelect('local')}
                  >
                    <CardContent className="flex items-center p-4">
                      <MapPin className="h-6 w-6 text-blue-600 mr-3" />
                      <div>
                        <h4 className="font-medium">Local Business</h4>
                        <p className="text-sm text-gray-600">
                          Physical location, serves local customers (restaurant, dentist, plumber)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:border-purple-500 transition-colors"
                    onClick={() => handleBusinessTypeSelect('hybrid')}
                  >
                    <CardContent className="flex items-center p-4">
                      <Building2 className="h-6 w-6 text-purple-600 mr-3" />
                      <div>
                        <h4 className="font-medium">Hybrid Business</h4>
                        <p className="text-sm text-gray-600">
                          Both local presence and online services (consulting, e-commerce with showroom)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:border-green-500 transition-colors"
                    onClick={() => handleBusinessTypeSelect('online')}
                  >
                    <CardContent className="flex items-center p-4">
                      <Zap className="h-6 w-6 text-green-600 mr-3" />
                      <div>
                        <h4 className="font-medium">Online Business</h4>
                        <p className="text-sm text-gray-600">
                          Purely digital services, no physical location (SaaS, online courses, digital agency)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && businessInfo.businessType && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                {getBusinessTypeIcon(businessInfo.businessType)}
                <h3 className="text-lg font-medium">
                  {businessInfo.businessType === 'local' ? 'Local Business' :
                   businessInfo.businessType === 'hybrid' ? 'Hybrid Business' : 'Online Business'} Details
                </h3>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    placeholder="Your Business Name"
                    value={businessInfo.name || ''}
                    onChange={(e) => updateBusinessInfo('name', e.target.value)}
                  />
                </div>

                {(businessInfo.businessType === 'local' || businessInfo.businessType === 'hybrid') && (
                  <>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="123 Main Street, City, State 12345"
                        value={businessInfo.address || ''}
                        onChange={(e) => updateBusinessInfo('address', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="(555) 123-4567"
                        value={businessInfo.phone || ''}
                        onChange={(e) => updateBusinessInfo('phone', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="hours">Business Hours</Label>
                      <Input
                        id="hours"
                        placeholder="Monday-Friday 9AM-5PM"
                        value={businessInfo.hours || ''}
                        onChange={(e) => updateBusinessInfo('hours', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {businessInfo.businessType === 'hybrid' && (
                  <div>
                    <Label htmlFor="service-area">Service Area</Label>
                    <Input
                      id="service-area"
                      placeholder="Serving San Francisco Bay Area"
                      value={businessInfo.serviceArea || ''}
                      onChange={(e) => updateBusinessInfo('serviceArea', e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="category">Business Category</Label>
                  <select
                    id="category"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={businessInfo.businessCategory || ''}
                    onChange={(e) => updateBusinessInfo('businessCategory', e.target.value)}
                  >
                    <option value="">Select a category (optional)</option>
                    <option value="restaurant">Restaurant/Food Service</option>
                    <option value="retail">Retail Store</option>
                    <option value="service">Professional Service</option>
                    <option value="medical">Healthcare/Medical</option>
                    <option value="automotive">Automotive</option>
                    <option value="emergency_service">Emergency Service</option>
                    <option value="local">General Local Business</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleSaveBusiness}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Setup
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">What happens next?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      SEOAgent will automatically generate optimized{' '}
                      {detectionResult?.recommendedSchemaType || 'LocalBusiness'} schema markup
                      for your website to help search engines understand your business better.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}