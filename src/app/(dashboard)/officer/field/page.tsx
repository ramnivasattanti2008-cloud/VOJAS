'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  MapPin,
  Navigation,
  Camera,
  FileText,
  CheckCircle,
  Clock,
  WifiOff,
  Wifi,
  ChevronRight,
  Save,
  Send,
  Image,
  ListChecks,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useFieldInspections, useSubmitFieldInspection, useUpdateFieldInspection } from '@/hooks/useOfficer';
import { formatDate } from '@/lib/utils';

// Mobile-first design for field officers
const INSPECTION_CHECKLIST = [
  'Verify project location coordinates',
  'Check project signage/board displayed',
  'Photograph current work status',
  'Document any visible issues',
  'Interview local beneficiaries (optional)',
  'Check nearby stakeholders for feedback',
  'Verify contractor presence (if applicable)',
  'Document access restrictions or issues',
];

export default function FieldOfficerModePage() {
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, { completed: boolean; notes: string }>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [showDraftSaved, setShowDraftSaved] = useState(false);

  const { data, isLoading, refetch } = useFieldInspections({
    status: 'PENDING',
    limit: 50,
  });
  const submitInspection = useSubmitFieldInspection();
  const updateInspection = useUpdateFieldInspection();

  const inspections = data?.data ?? [];

  const handleStartInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    // Initialize checklist
    const initChecklist: Record<string, { completed: boolean; notes: string }> = {};
    INSPECTION_CHECKLIST.forEach((item) => {
      initChecklist[item] = { completed: false, notes: '' };
    });
    setChecklist(initChecklist);
    setPhotos([]);
    setNotes('');
  };

  const handleToggleChecklist = (item: string) => {
    setChecklist((prev) => ({
      ...prev,
      [item]: { ...prev[item], completed: !prev[item].completed },
    }));
  };

  const handleUpdateNotes = (item: string, notes: string) => {
    setChecklist((prev) => ({
      ...prev,
      [item]: { ...prev[item], notes },
    }));
  };

  const handleAddPhoto = () => {
    // In a real app, this would trigger camera/file picker
    // For demo, add a placeholder
    const newPhoto = `photo_${Date.now()}.jpg`;
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const handleSaveDraft = () => {
    if (selectedInspection) {
      updateInspection.mutate({
        inspectionId: selectedInspection.id,
        updates: {
          checklist: Object.entries(checklist).map(([item, value]) => ({
            item,
            completed: value.completed,
            notes: value.notes || undefined,
          })),
          notes,
          status: 'IN_PROGRESS',
        },
      });
      setShowDraftSaved(true);
      setTimeout(() => setShowDraftSaved(false), 3000);
    }
  };

  const handleSubmit = () => {
    if (selectedInspection) {
      submitInspection.mutate({
        inspectionId: selectedInspection.id,
        data: {
          checklist: Object.entries(checklist).map(([item, value]) => ({
            item,
            completed: value.completed,
            notes: value.notes || undefined,
          })),
          notes,
          photos,
        },
      });
      setSelectedInspection(null);
    }
  };

  const completedCount = Object.values(checklist).filter((c) => c.completed).length;
  const progress = (completedCount / INSPECTION_CHECKLIST.length) * 100;

  if (selectedInspection) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-vojas-600" />
              Field Inspection
            </h1>
            <p className="text-xs text-slate-500">{selectedInspection.projectName}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="success" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Online
              </Badge>
            ) : (
              <Badge variant="warning" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Offline
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedInspection(null)}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progress</span>
              <span className="text-sm text-slate-500">{completedCount}/{INSPECTION_CHECKLIST.length}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-vojas-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardBody>
        </Card>

        {/* Location */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-vojas-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-vojas-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{selectedInspection.location}</p>
                  <p className="text-xs text-slate-400">Tap for directions</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" leftIcon={<Navigation className="h-4 w-4" />}>
                Navigate
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Inspection Checklist</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {INSPECTION_CHECKLIST.map((item, index) => (
              <div key={item} className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleChecklist(item)}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    checklist[item]?.completed
                      ? 'bg-vojas-600 border-vojas-600 text-white'
                      : 'border-slate-300 hover:border-vojas-400'
                  }`}
                >
                  {checklist[item]?.completed && <CheckCircle className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${checklist[item]?.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {item}
                  </p>
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={checklist[item]?.notes ?? ''}
                    onChange={(e) => handleUpdateNotes(item, e.target.value)}
                    className="w-full mt-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-vojas-500"
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Image className="h-4 w-4 text-slate-400" />
              Photos ({photos.length})
            </h3>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Camera className="h-4 w-4" />}
              onClick={handleAddPhoto}
            >
              Add Photo
            </Button>
          </CardHeader>
          <CardBody>
            {photos.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <Camera className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No photos added yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, i) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                    <Image className="h-6 w-6 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              General Notes
            </h3>
          </CardHeader>
          <CardBody>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional observations or notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500 min-h-24"
            />
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="sticky bottom-4 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            leftIcon={<Save className="h-4 w-4" />}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            leftIcon={<Send className="h-4 w-4" />}
            onClick={handleSubmit}
            disabled={!isOnline}
          >
            Submit
          </Button>
        </div>

        {/* Draft Saved Toast */}
        {showDraftSaved && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            Draft saved
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-vojas-600" />
            Field Officer Mode
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Mobile interface for on-site inspections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="success" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" /> Online
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOnline((o) => !o)}
            leftIcon={<RefreshCw className="h-3 w-3" />}
          >
            Toggle
          </Button>
          <Link href="/officer">
            <Button variant="secondary" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <Card className="border-amber-300 bg-amber-50">
          <CardBody className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">You are offline</p>
              <p className="text-xs text-amber-600 mt-1">
                Inspections can still be recorded and will be synced when connection is restored.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Assigned Inspections */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Assigned Inspections</h3>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-50 rounded animate-pulse" />
              ))}
            </div>
          ) : inspections.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No pending inspections</p>
              <p className="text-xs text-slate-400 mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inspections.map((inspection) => (
                <button
                  key={inspection.id}
                  onClick={() => handleStartInspection(inspection)}
                  className="w-full px-4 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-slate-900 truncate">
                          {inspection.projectName}
                        </h4>
                        <Badge
                          variant={inspection.status === 'PENDING' ? 'warning' : inspection.status === 'IN_PROGRESS' ? 'info' : 'success'}
                          className="text-xs"
                        >
                          {inspection.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {inspection.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(inspection.scheduledDate)}
                        </span>
                      </div>
                      {inspection.assignedOfficer && (
                        <p className="text-xs text-slate-400 mt-1">
                          Assigned to: {inspection.assignedOfficer.name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recent Completed */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Recently Completed</h3>
        </CardHeader>
        <CardBody className="p-0">
          <div className="py-6 text-center text-slate-400">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs text-slate-400">Completed inspections will appear here</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
