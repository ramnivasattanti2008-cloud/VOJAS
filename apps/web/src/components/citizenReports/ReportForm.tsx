'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useSubmitReport } from '@/hooks/useCitizenReports';
import { usePublicProject } from '@/hooks/usePublicProjects';
import {
    PRIVACY_LABELS,
    type ReportPrivacyLevel
} from '@vojas/api-client';
import { AlertCircle, Building2, Calendar, CheckCircle, Info, MapPin, Shield } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

const CATEGORIES = [
  { value: 'PROJECT_NOT_STARTED', label: 'Project Not Started', icon: '🏗️' },
  { value: 'PROJECT_DELAY', label: 'Project Delay', icon: '⏰' },
  { value: 'WORK_QUALITY', label: 'Work Quality Issue', icon: '🔧' },
  { value: 'PROJECT_INCOMPLETE', label: 'Project Incomplete', icon: '📋' },
  { value: 'PUBLIC_SAFETY', label: 'Public Safety Concern', icon: '⚠️' },
  { value: 'ENVIRONMENTAL_CONCERN', label: 'Environmental Concern', icon: '🌿' },
  { value: 'FINANCIAL_CONCERN', label: 'Financial Concern', icon: '💰' },
  { value: 'DOCUMENT_CONCERN', label: 'Document Concern', icon: '📄' },
  { value: 'CONTRACTOR_CONCERN', label: 'Contractor Concern', icon: '👷' },
  { value: 'OTHER', label: 'Other', icon: '❓' },
];

const PRIVACY_OPTIONS: ReportPrivacyLevel[] = ['PUBLIC', 'RESTRICTED', 'CONFIDENTIAL', 'ANONYMOUS'];

interface FormData {
  privacyLevel: ReportPrivacyLevel;
  category: string;
  title: string;
  description: string;
  useLocation: boolean;
  locationDesc: string;
  latitude: string;
  longitude: string;
  locationAccuracyM: string;
  unknownLocation: boolean;
  incidentDate: string;
  projectId: string;
  unknownProject: boolean;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  isAnonymous: boolean;
}

const initialFormData: FormData = {
  privacyLevel: 'PUBLIC',
  category: '',
  title: '',
  description: '',
  useLocation: false,
  locationDesc: '',
  latitude: '',
  longitude: '',
  locationAccuracyM: '',
  unknownLocation: false,
  incidentDate: '',
  projectId: '',
  unknownProject: true,
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
  isAnonymous: false,
};

export function ReportForm() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') ?? '';
  const { data: linkedProject } = usePublicProject(initialProjectId || undefined);

  const [formData, setFormData] = useState<FormData>(() => ({
    ...initialFormData,
    projectId: initialProjectId,
    unknownProject: !initialProjectId,
  }));
  const [submitted, setSubmitted] = useState(false);
  const [reportReference, setReportReference] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitReport = useSubmitReport();

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleChange('latitude', position.coords.latitude.toString());
          handleChange('longitude', position.coords.longitude.toString());
          handleChange('locationAccuracyM', position.coords.accuracy.toString());
          handleChange('useLocation', true);
          handleChange('unknownLocation', false);
        },
        () => {
          alert('Unable to get your location. Please enter coordinates manually.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.title.trim()) {
      alert('Please enter a title for your report.');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please describe what you observed.');
      return;
    }
    if (!formData.category) {
      alert('Please select a category.');
      return;
    }

    try {
      const result = await submitReport.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        privacyLevel: formData.privacyLevel,
        locationDesc: formData.locationDesc.trim() || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        locationAccuracyM: formData.locationAccuracyM ? parseFloat(formData.locationAccuracyM) : undefined,
        incidentDate: formData.incidentDate || undefined,
        projectId: formData.projectId.trim() || undefined,
        reporterName: formData.isAnonymous ? undefined : formData.reporterName.trim() || undefined,
        reporterEmail: formData.isAnonymous ? undefined : formData.reporterEmail.trim() || undefined,
        reporterPhone: formData.isAnonymous ? undefined : formData.reporterPhone.trim() || undefined,
        isAnonymous: formData.isAnonymous,
      });

      setReportReference(result.reportReference);
      setSubmitted(true);
    } catch {
      setSubmitError('Failed to submit report. Please check your connection and try again.');
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardBody className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Report Submitted</h2>
            <p className="text-slate-600 mb-6">
              Thank you for helping improve public accountability. Your report has been received.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-500 mb-1">Your Reference Number</p>
              <p className="text-2xl font-mono font-bold text-vojas-600">{reportReference}</p>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Save this reference number to track your report status.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.print()} variant="secondary">
                Print Reference
              </Button>
              <Button onClick={() => { window.location.href = `/report/track/${reportReference}`; }}>
                Track This Report
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => {
            setSubmitted(false);
            setFormData(initialFormData);
            setReportReference('');
          }}>
            Submit Another Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Report what you observed</h1>
        <p className="text-slate-600 mt-2">
          Help us ensure public projects are built correctly and on time.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardBody className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Your information is protected</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>You can submit anonymously</li>
              <li>Location is stored with configurable precision</li>
              <li>Media metadata is stripped before public display</li>
              <li>Your identity is never shared without your consent</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Privacy Level */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-500" />
              Privacy Level
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {PRIVACY_OPTIONS.map((level) => (
              <label
                key={level}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.privacyLevel === level
                    ? 'border-vojas-500 bg-vojas-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="privacyLevel"
                  value={level}
                  checked={formData.privacyLevel === level}
                  onChange={() => handleChange('privacyLevel', level)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-slate-900">{PRIVACY_LABELS[level].label}</span>
                  <p className="text-sm text-slate-600">{PRIVACY_LABELS[level].description}</p>
                </div>
              </label>
            ))}
          </CardBody>
        </Card>

        {/* Category */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">What type of issue?</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleChange('category', cat.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.category === cat.value
                      ? 'border-vojas-500 bg-vojas-50 text-vojas-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-xl mb-1 block">{cat.icon}</span>
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Title & Description */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Tell us what you observed</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Short Description"
              placeholder="Brief title for your report (e.g., 'Road construction stopped for 3 months')"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={200}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Detailed Description</label>
              <textarea
                placeholder="Describe what you observed in detail. Include dates, locations, and any people involved."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              />
              <p className="text-xs text-slate-500">{formData.description.length}/2000 characters</p>
            </div>
          </CardBody>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-500" />
              Location
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleUseLocation} size="sm">
                <MapPin className="h-4 w-4 mr-1" />
                Use My Location
              </Button>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.unknownLocation}
                  onChange={(e) => handleChange('unknownLocation', e.target.checked)}
                  className="rounded"
                />
                I don&apos;t know the exact location
              </label>
            </div>

            {!formData.unknownLocation && (
              <>
                {formData.latitude && formData.longitude && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <p className="text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Location captured
                    </p>
                    <p className="font-mono text-green-700 mt-1">
                      {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Latitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 12.9716"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                  />
                  <Input
                    label="Longitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 77.5946"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                  />
                </div>
              </>
            )}

            <Input
              label="Location Description"
              placeholder="e.g., Near the market road, 500m from the village temple"
              value={formData.locationDesc}
              onChange={(e) => handleChange('locationDesc', e.target.value)}
              hint="Help reviewers find this location on a map"
            />
          </CardBody>
        </Card>

        {/* Date */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" />
              When did you observe this?
            </h2>
          </CardHeader>
          <CardBody>
            <Input
              type="date"
              value={formData.incidentDate}
              onChange={(e) => handleChange('incidentDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </CardBody>
        </Card>

        {/* Project */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Is this related to a specific project?</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {linkedProject && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="font-semibold">{linkedProject.name}</p>
                </div>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  {[linkedProject.district, linkedProject.state].filter(Boolean).join(', ')} · Sector: {linkedProject.sector.replace(/_/g, ' ')}
                </p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.unknownProject}
                onChange={(e) => handleChange('unknownProject', e.target.checked)}
                className="rounded"
              />
              I don&apos;t know which project this relates to
            </label>
            {!formData.unknownProject && (
              <Input
                label="Project ID (if known)"
                placeholder="e.g., showcase-fin-1"
                value={formData.projectId}
                onChange={(e) => handleChange('projectId', e.target.value)}
                hint="You can find this on project notices or documents"
              />
            )}
          </CardBody>
        </Card>

        {/* Reporter Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Your Contact Information</h2>
            <p className="text-sm text-slate-500 mt-1">Optional. We may contact you for more information.</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAnonymous}
                onChange={(e) => handleChange('isAnonymous', e.target.checked)}
                className="rounded"
              />
              Submit anonymously
            </label>

            {!formData.isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Your Name" placeholder="Full name" value={formData.reporterName} onChange={(e) => handleChange('reporterName', e.target.value)} />
                <Input label="Email" type="email" placeholder="your@email.com" value={formData.reporterEmail} onChange={(e) => handleChange('reporterEmail', e.target.value)} />
                <Input label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" value={formData.reporterPhone} onChange={(e) => handleChange('reporterPhone', e.target.value)} className="sm:col-span-2" />
              </div>
            )}

            {formData.isAnonymous && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Your report will be submitted anonymously.
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={() => setFormData(initialFormData)}>
            Clear Form
          </Button>
          <Button type="submit" isLoading={submitReport.isPending} size="lg">
            Submit Report
          </Button>
        </div>
      </form>
    </div>
  );
}
