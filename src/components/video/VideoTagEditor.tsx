'use client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  VideoStructuredTags,
  PillarTag,
  SystemTag,
  UserTypeTag,
  AngleMarkerTag,
  ArchLevelTag,
  SYSTEM_TAGS,
  USER_TYPE_TAGS,
  ANGLE_MARKER_TAGS,
  ARCH_LEVEL_TAGS,
  SYSTEM_TAG_METADATA,
  USER_TYPE_TAG_METADATA,
  ARCH_LEVEL_TAG_METADATA,
  ANGLE_MARKER_TAG_METADATA,
  createEmptyStructuredTags,
} from '@/types';
import { PILLARS, pillarOptionLabel, pillarShortLabel } from '@/types/onboarding';
import { X, Tags, Target, Users, Compass, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoTagEditorProps {
  /** Current structured tags value */
  value: VideoStructuredTags | undefined;
  /** Callback when tags change */
  onChange: (tags: VideoStructuredTags) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Show as compact inline version */
  compact?: boolean;
}

/**
 * Multi-select tag editor for video content structured tags.
 * Allows editing pillar, systems, user types, angle markers, and architecture level.
 */
export function VideoTagEditor({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
}: VideoTagEditorProps) {
  // Initialize with empty tags if undefined
  const tags = value || createEmptyStructuredTags();

  const handlePillarChange = (pillar: string) => {
    onChange({
      ...tags,
      pillar: pillar === 'none' ? undefined : (pillar as PillarTag),
    });
  };

  const handleSystemToggle = (system: SystemTag) => {
    const newSystems = tags.systems.includes(system)
      ? tags.systems.filter((s) => s !== system)
      : [...tags.systems, system];
    onChange({ ...tags, systems: newSystems });
  };

  const handleUserTypeToggle = (userType: UserTypeTag) => {
    const newUserTypes = tags.userTypes.includes(userType)
      ? tags.userTypes.filter((u) => u !== userType)
      : [...tags.userTypes, userType];
    onChange({ ...tags, userTypes: newUserTypes });
  };

  const handleAngleMarkerToggle = (marker: AngleMarkerTag) => {
    const newMarkers = tags.angleMarkers.includes(marker)
      ? tags.angleMarkers.filter((m) => m !== marker)
      : [...tags.angleMarkers, marker];
    onChange({ ...tags, angleMarkers: newMarkers });
  };

  const handleArchLevelChange = (level: string) => {
    onChange({
      ...tags,
      archLevel: level === 'none' ? undefined : (level as ArchLevelTag),
    });
  };

  // Color mapping for system tags
  const getSystemColor = (system: SystemTag, selected: boolean) => {
    const colors: Record<string, string> = {
      blue: selected ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300',
      green: selected ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300',
      purple: selected ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300',
      orange: selected ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300',
      gray: selected ? 'bg-gray-200 text-gray-700 border-gray-400' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400',
    };
    return colors[SYSTEM_TAG_METADATA[system].color] || colors.gray;
  };

  // Compact view for inline usage
  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Pillar Select */}
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-400" />
          <Select
            value={tags.pillar || 'none'}
            onValueChange={handlePillarChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select pillar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Pillar</SelectItem>
              {PILLARS.map((pillar) => (
                <SelectItem key={pillar.slug} value={pillar.slug}>
                  {pillarShortLabel(pillar)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Tags */}
        <div className="flex flex-wrap gap-1">
          {SYSTEM_TAGS.map((system) => (
            <button
              key={system}
              type="button"
              onClick={() => handleSystemToggle(system)}
              disabled={disabled}
              className={cn(
                'px-2 py-0.5 text-xs rounded-full border transition-colors',
                getSystemColor(system, tags.systems.includes(system)),
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {system}
            </button>
          ))}
        </div>

        {/* User Types */}
        <div className="flex flex-wrap gap-1">
          {USER_TYPE_TAGS.map((userType) => (
            <button
              key={userType}
              type="button"
              onClick={() => handleUserTypeToggle(userType)}
              disabled={disabled}
              className={cn(
                'px-2 py-0.5 text-xs rounded-full border transition-colors capitalize',
                tags.userTypes.includes(userType)
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {userType}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full card-based editor
  return (
    <Card className={cn('border-red-100 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Content Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pillar Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Pillar
          </Label>
          <Select
            value={tags.pillar || 'none'}
            onValueChange={handlePillarChange}
            disabled={disabled}
          >
            <SelectTrigger className="border-slate-300 focus:ring-red-200">
              <SelectValue placeholder="Select a pillar (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Pillar</SelectItem>
              {PILLARS.map((pillar) => (
                <SelectItem key={pillar.slug} value={pillar.slug}>
                  {pillarOptionLabel(pillar)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Associate this content with a specific learning pillar
          </p>
        </div>

        {/* System Tags */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Systems
          </Label>
          <div className="flex flex-wrap gap-2">
            {SYSTEM_TAGS.map((system) => {
              const metadata = SYSTEM_TAG_METADATA[system];
              const isSelected = tags.systems.includes(system);
              return (
                <button
                  key={system}
                  type="button"
                  onClick={() => handleSystemToggle(system)}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                    getSystemColor(system, isSelected),
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={metadata.description}
                >
                  {system}
                  {isSelected && (
                    <X className="inline-block ml-1 h-3 w-3" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            Select applicable goaltending systems (multiple allowed)
          </p>
        </div>

        {/* User Types */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Target Audience
          </Label>
          <div className="flex flex-wrap gap-2">
            {USER_TYPE_TAGS.map((userType) => {
              const metadata = USER_TYPE_TAG_METADATA[userType];
              const isSelected = tags.userTypes.includes(userType);
              return (
                <button
                  key={userType}
                  type="button"
                  onClick={() => handleUserTypeToggle(userType)}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-sm font-medium transition-all capitalize',
                    isSelected
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={metadata.description}
                >
                  {metadata.name}
                  {isSelected && (
                    <X className="inline-block ml-1 h-3 w-3" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            Who is this content designed for? (multiple allowed)
          </p>
        </div>

        {/* Angle Markers */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Angle Markers
          </Label>
          <div className="flex flex-wrap gap-2">
            {ANGLE_MARKER_TAGS.map((marker) => {
              const metadata = ANGLE_MARKER_TAG_METADATA[marker];
              const isSelected = tags.angleMarkers.includes(marker);
              return (
                <button
                  key={marker}
                  type="button"
                  onClick={() => handleAngleMarkerToggle(marker)}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-cyan-100 text-cyan-700 border-cyan-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-cyan-300',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={`${metadata.position}: ${metadata.description}`}
                >
                  {marker}
                  {isSelected && (
                    <X className="inline-block ml-1 h-3 w-3" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            Position-specific training markers (multiple allowed)
          </p>
        </div>

        {/* Architecture Level */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Content Level
          </Label>
          <Select
            value={tags.archLevel || 'none'}
            onValueChange={handleArchLevelChange}
            disabled={disabled}
          >
            <SelectTrigger className="border-slate-300 focus:ring-red-200">
              <SelectValue placeholder="Select content level (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Level</SelectItem>
              {ARCH_LEVEL_TAGS.map((level) => {
                const metadata = ARCH_LEVEL_TAG_METADATA[level];
                return (
                  <SelectItem key={level} value={level}>
                    {level}: {metadata.name} - {metadata.description}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Complexity/depth level of this content
          </p>
        </div>

        {/* Tag Summary */}
        {(tags.pillar || tags.systems.length > 0 || tags.userTypes.length > 0 || tags.angleMarkers.length > 0 || tags.archLevel) && (
          <div className="pt-4 border-t">
            <Label className="text-sm text-gray-600 mb-2 block">Active Tags</Label>
            <div className="flex flex-wrap gap-1">
              {tags.pillar && (
                <Badge variant="outline" className="bg-primary/10">
                  {(() => {
                    const pillar = PILLARS.find(p => p.slug === tags.pillar);
                    return pillar ? pillarShortLabel(pillar) : tags.pillar;
                  })()}
                </Badge>
              )}
              {tags.systems.map((system) => (
                <Badge key={system} variant="outline" className="bg-blue-50 text-blue-700">
                  {system}
                </Badge>
              ))}
              {tags.userTypes.map((userType) => (
                <Badge key={userType} variant="outline" className="bg-blue-50 text-blue-700 capitalize">
                  {userType}
                </Badge>
              ))}
              {tags.angleMarkers.map((marker) => (
                <Badge key={marker} variant="outline" className="bg-cyan-50 text-cyan-700">
                  {marker}
                </Badge>
              ))}
              {tags.archLevel && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {tags.archLevel}: {ARCH_LEVEL_TAG_METADATA[tags.archLevel].name}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VideoTagEditor;
