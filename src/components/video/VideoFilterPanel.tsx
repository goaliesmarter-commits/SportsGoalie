'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  VideoTagFilter,
  TagFacetCounts,
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
  countActiveFilters,
} from '@/types';
import { PILLARS } from '@/types/onboarding';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Target,
  Users,
  Compass,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The admin pages are painted on navy (`rgba(2,18,44,…)`) with a `#37b5ff` accent,
 * while the learner-facing pages are white. The panel carries both palettes rather
 * than letting a host page fight its utility classes from a stylesheet — the class
 * names below are an implementation detail and shouldn't be reachable from outside.
 */
type PanelTheme = 'light' | 'dark';

/** The accent families the chips are colour-coded with. */
type ChipTone = 'primary' | 'blue' | 'green' | 'purple' | 'orange' | 'gray' | 'indigo' | 'cyan';

/** Selected chip. On navy a `*-100` fill glares instead of reading as "on", so dark
 *  inverts the recipe: a translucent wash of the same hue under a lit border. */
const SELECTED_CHIP: Record<PanelTheme, Record<ChipTone, string>> = {
  light: {
    primary: 'bg-primary/10 border-primary text-primary',
    blue: 'bg-blue-100 border-blue-400 text-blue-700',
    green: 'bg-green-100 border-green-400 text-green-700',
    purple: 'bg-purple-100 border-purple-400 text-purple-700',
    orange: 'bg-orange-100 border-orange-400 text-orange-700',
    gray: 'bg-gray-200 border-gray-400 text-gray-700',
    indigo: 'bg-indigo-100 border-indigo-400 text-indigo-700',
    cyan: 'bg-cyan-100 border-cyan-400 text-cyan-700',
  },
  dark: {
    primary: 'bg-sky-400/20 border-sky-400/70 text-sky-200',
    blue: 'bg-sky-400/20 border-sky-400/70 text-sky-200',
    green: 'bg-emerald-400/20 border-emerald-400/70 text-emerald-200',
    purple: 'bg-purple-400/20 border-purple-400/70 text-purple-200',
    orange: 'bg-orange-400/20 border-orange-400/70 text-orange-200',
    gray: 'bg-slate-300/20 border-slate-300/60 text-slate-100',
    indigo: 'bg-indigo-400/20 border-indigo-400/70 text-indigo-200',
    cyan: 'bg-cyan-400/20 border-cyan-400/70 text-cyan-200',
  },
};

/** Unselected chip: neutral until hovered, when it previews its section's hue. */
const IDLE_CHIP: Record<PanelTheme, string> = {
  light: 'bg-gray-50 text-gray-600 border-gray-200',
  dark: 'bg-white/[0.04] text-white/60 border-white/10',
};

const IDLE_CHIP_HOVER: Record<PanelTheme, Record<ChipTone, string>> = {
  light: {
    primary: 'hover:border-primary/50',
    blue: 'hover:border-blue-300',
    green: 'hover:border-green-300',
    purple: 'hover:border-purple-300',
    orange: 'hover:border-orange-300',
    gray: 'hover:border-gray-400',
    indigo: 'hover:border-indigo-300',
    cyan: 'hover:border-cyan-300',
  },
  dark: {
    primary: 'hover:border-sky-400/50',
    blue: 'hover:border-sky-400/50',
    green: 'hover:border-emerald-400/50',
    purple: 'hover:border-purple-400/50',
    orange: 'hover:border-orange-400/50',
    gray: 'hover:border-slate-300/50',
    indigo: 'hover:border-indigo-400/50',
    cyan: 'hover:border-cyan-400/50',
  },
};

/** Card shell, headings and dividers. The dark card is the exact `card` object the
 *  admin pages build inline, so the panel sits flush with the boxes around it. */
const CHROME: Record<PanelTheme, {
  card: string;
  title: string;
  mutedIcon: string;
  mutedText: string;
  divider: string;
  countBadge: string;
  activeBadge: string;
  clearAll: string;
}> = {
  light: {
    card: '',
    title: '',
    mutedIcon: 'text-gray-500',
    mutedText: 'text-gray-600',
    divider: 'border-b',
    countBadge: '',
    activeBadge: 'hover:bg-red-100',
    clearAll: 'text-gray-500 hover:text-red-600',
  },
  dark: {
    card: 'rounded-2xl border-[#37b5ff24] bg-[#02122cd9] text-white shadow-none',
    title: 'text-white',
    mutedIcon: 'text-white/40',
    mutedText: 'text-white/50',
    divider: 'border-b border-white/10',
    countBadge: 'border-transparent bg-sky-400/20 text-sky-200',
    activeBadge:
      'border-transparent bg-white/10 text-white/75 hover:bg-red-400/25 hover:text-red-200',
    clearAll: 'text-white/45 hover:text-red-300',
  },
};

interface VideoFilterPanelProps {
  /** Current filter state */
  filter: VideoTagFilter;
  /** Callback when filter changes */
  onFilterChange: (filter: VideoTagFilter) => void;
  /** Facet counts for showing available options */
  facets?: TagFacetCounts;
  /** Whether the panel is loading */
  loading?: boolean;
  /** Additional class name */
  className?: string;
  /** Start collapsed */
  defaultCollapsed?: boolean;
  /** Palette to paint the panel in. Admin pages are navy; everything else is white. */
  theme?: PanelTheme;
}

/**
 * Collapsible filter panel for video content by structured tags.
 * Shows filter sections for pillars, systems, user types, angle markers, and levels.
 */
export function VideoFilterPanel({
  filter,
  onFilterChange,
  facets,
  loading = false,
  className,
  defaultCollapsed = false,
  theme = 'light',
}: VideoFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  const activeFilterCount = countActiveFilters(filter);
  const chrome = CHROME[theme];

  /** Every filter chip in the panel is built from this, so the five sections can
   *  only ever differ by hue — never by size, radius or hover behaviour. */
  const chipClass = (tone: ChipTone, selected: boolean) =>
    cn(
      'px-2.5 py-1 text-xs rounded-full border transition-colors',
      selected
        ? SELECTED_CHIP[theme][tone]
        : cn(IDLE_CHIP[theme], IDLE_CHIP_HOVER[theme][tone]),
      loading && 'opacity-50 cursor-not-allowed'
    );

  const handlePillarToggle = (pillar: PillarTag) => {
    const newPillars = filter.pillars?.includes(pillar)
      ? filter.pillars.filter((p) => p !== pillar)
      : [...(filter.pillars || []), pillar];
    onFilterChange({ ...filter, pillars: newPillars.length ? newPillars : undefined });
  };

  const handleSystemToggle = (system: SystemTag) => {
    const newSystems = filter.systems?.includes(system)
      ? filter.systems.filter((s) => s !== system)
      : [...(filter.systems || []), system];
    onFilterChange({ ...filter, systems: newSystems.length ? newSystems : undefined });
  };

  const handleUserTypeToggle = (userType: UserTypeTag) => {
    const newUserTypes = filter.userTypes?.includes(userType)
      ? filter.userTypes.filter((u) => u !== userType)
      : [...(filter.userTypes || []), userType];
    onFilterChange({ ...filter, userTypes: newUserTypes.length ? newUserTypes : undefined });
  };

  const handleAngleMarkerToggle = (marker: AngleMarkerTag) => {
    const newMarkers = filter.angleMarkers?.includes(marker)
      ? filter.angleMarkers.filter((m) => m !== marker)
      : [...(filter.angleMarkers || []), marker];
    onFilterChange({ ...filter, angleMarkers: newMarkers.length ? newMarkers : undefined });
  };

  const handleArchLevelToggle = (level: ArchLevelTag) => {
    const newLevels = filter.archLevels?.includes(level)
      ? filter.archLevels.filter((l) => l !== level)
      : [...(filter.archLevels || []), level];
    onFilterChange({ ...filter, archLevels: newLevels.length ? newLevels : undefined });
  };

  const handleClearAll = () => {
    onFilterChange({});
  };

  const handleRemoveFilter = (type: string, value: string) => {
    switch (type) {
      case 'pillar':
        onFilterChange({
          ...filter,
          pillars: filter.pillars?.filter((p) => p !== value) || undefined,
        });
        break;
      case 'system':
        onFilterChange({
          ...filter,
          systems: filter.systems?.filter((s) => s !== value) || undefined,
        });
        break;
      case 'userType':
        onFilterChange({
          ...filter,
          userTypes: filter.userTypes?.filter((u) => u !== value) || undefined,
        });
        break;
      case 'angleMarker':
        onFilterChange({
          ...filter,
          angleMarkers: filter.angleMarkers?.filter((m) => m !== value) || undefined,
        });
        break;
      case 'archLevel':
        onFilterChange({
          ...filter,
          archLevels: filter.archLevels?.filter((l) => l !== value) || undefined,
        });
        break;
    }
  };

  /** Each system tag names its own hue in metadata; anything the chip palette
   *  doesn't cover falls back to grey rather than rendering unstyled. */
  const systemTone = (system: SystemTag): ChipTone => {
    const color = SYSTEM_TAG_METADATA[system].color;
    return color in SELECTED_CHIP.light ? (color as ChipTone) : 'gray';
  };

  return (
    // no-button-zoom: the trigger spans the full width with the icon and the chevron
    // pinned to opposite edges, so the shared Button's hover:scale-105 drags them
    // outward past the card border. Scoped to the card so "Clear All" is steady too.
    <Card className={cn('no-button-zoom', chrome.card, className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            >
              <CardTitle className={cn('text-lg flex items-center gap-2', chrome.title)}>
                <Filter className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className={cn('ml-2', chrome.countBadge)}>
                    {activeFilterCount}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className={cn('h-5 w-5', chrome.mutedIcon)} />
              ) : (
                <ChevronDown className={cn('h-5 w-5', chrome.mutedIcon)} />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className={cn('pb-3', chrome.divider)}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-sm font-medium', chrome.mutedText)}>Active Filters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className={cn('h-auto py-1 px-2 text-xs', chrome.clearAll)}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {filter.pillars?.map((pillar) => (
                    <Badge
                      key={pillar}
                      variant="secondary"
                      className={cn('pl-2 pr-1 cursor-pointer', chrome.activeBadge)}
                      onClick={() => handleRemoveFilter('pillar', pillar)}
                    >
                      {PILLARS.find((p) => p.slug === pillar)?.shortName || pillar}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  {filter.systems?.map((system) => (
                    <Badge
                      key={system}
                      variant="secondary"
                      className={cn('pl-2 pr-1 cursor-pointer', chrome.activeBadge)}
                      onClick={() => handleRemoveFilter('system', system)}
                    >
                      {system}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  {filter.userTypes?.map((userType) => (
                    <Badge
                      key={userType}
                      variant="secondary"
                      className={cn('pl-2 pr-1 cursor-pointer capitalize', chrome.activeBadge)}
                      onClick={() => handleRemoveFilter('userType', userType)}
                    >
                      {userType}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  {filter.angleMarkers?.map((marker) => (
                    <Badge
                      key={marker}
                      variant="secondary"
                      className={cn('pl-2 pr-1 cursor-pointer', chrome.activeBadge)}
                      onClick={() => handleRemoveFilter('angleMarker', marker)}
                    >
                      {marker}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  {filter.archLevels?.map((level) => (
                    <Badge
                      key={level}
                      variant="secondary"
                      className={cn('pl-2 pr-1 cursor-pointer', chrome.activeBadge)}
                      onClick={() => handleRemoveFilter('archLevel', level)}
                    >
                      {level}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Pillars */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className={cn('h-4 w-4', chrome.mutedIcon)} />
                Pillars
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PILLARS.map((pillar) => {
                  const isSelected = filter.pillars?.includes(pillar.slug);
                  const count = facets?.pillars[pillar.slug] || 0;
                  return (
                    <button
                      key={pillar.slug}
                      type="button"
                      onClick={() => handlePillarToggle(pillar.slug)}
                      disabled={loading}
                      className={chipClass('primary', !!isSelected)}
                    >
                      {pillar.shortName}
                      {facets && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Systems */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers className={cn('h-4 w-4', chrome.mutedIcon)} />
                Systems
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SYSTEM_TAGS.map((system) => {
                  const isSelected = filter.systems?.includes(system) ?? false;
                  const count = facets?.systems[system] || 0;
                  return (
                    <button
                      key={system}
                      type="button"
                      onClick={() => handleSystemToggle(system)}
                      disabled={loading}
                      className={chipClass(systemTone(system), isSelected)}
                      title={SYSTEM_TAG_METADATA[system].description}
                    >
                      {system}
                      {facets && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Types */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className={cn('h-4 w-4', chrome.mutedIcon)} />
                Audience
              </div>
              <div className="flex flex-wrap gap-1.5">
                {USER_TYPE_TAGS.map((userType) => {
                  const isSelected = filter.userTypes?.includes(userType);
                  const count = facets?.userTypes[userType] || 0;
                  const metadata = USER_TYPE_TAG_METADATA[userType];
                  return (
                    <button
                      key={userType}
                      type="button"
                      onClick={() => handleUserTypeToggle(userType)}
                      disabled={loading}
                      className={cn('capitalize', chipClass('indigo', !!isSelected))}
                      title={metadata.description}
                    >
                      {metadata.name}
                      {facets && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Angle Markers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Compass className={cn('h-4 w-4', chrome.mutedIcon)} />
                Angle Markers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ANGLE_MARKER_TAGS.map((marker) => {
                  const isSelected = filter.angleMarkers?.includes(marker);
                  const count = facets?.angleMarkers[marker] || 0;
                  const metadata = ANGLE_MARKER_TAG_METADATA[marker];
                  return (
                    <button
                      key={marker}
                      type="button"
                      onClick={() => handleAngleMarkerToggle(marker)}
                      disabled={loading}
                      className={chipClass('cyan', !!isSelected)}
                      title={`${metadata.position}: ${metadata.description}`}
                    >
                      {marker}
                      {facets && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Architecture Levels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers className={cn('h-4 w-4', chrome.mutedIcon)} />
                Content Level
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARCH_LEVEL_TAGS.map((level) => {
                  const isSelected = filter.archLevels?.includes(level);
                  const count = facets?.archLevels[level] || 0;
                  const metadata = ARCH_LEVEL_TAG_METADATA[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleArchLevelToggle(level)}
                      disabled={loading}
                      className={chipClass('purple', !!isSelected)}
                      title={metadata.description}
                    >
                      {level}: {metadata.name}
                      {facets && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default VideoFilterPanel;
