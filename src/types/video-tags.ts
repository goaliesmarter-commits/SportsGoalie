/**
 * Video Tag Types for Structured Content Filtering
 *
 * This module defines the structured tagging system for video content,
 * enabling precise filtering by pillar, system, user type, angle markers,
 * and architecture level.
 */

import { PillarSlug } from './onboarding';

// ==========================================
// CORE TAG TYPES
// ==========================================

/**
 * Pillar tags - references the 7 learning pillars
 */
export type PillarTag = PillarSlug;

/**
 * System tags - goaltending methodology systems
 */
export type SystemTag = '7AMS' | '6ZS' | '4LAS' | 'Box' | 'General';

/**
 * User type tags - target audience for content
 */
export type UserTypeTag = 'goalie' | 'parent' | 'coach';

/**
 * Angle marker tags - net positions for angle-specific training (AM1-AM7)
 */
export type AngleMarkerTag = 'AM1' | 'AM2' | 'AM3' | 'AM4' | 'AM5' | 'AM6' | 'AM7';

/**
 * Architecture level tags - content depth/complexity
 */
export type ArchLevelTag = 'L1' | 'L2' | 'L3' | 'L4';

// ==========================================
// STRUCTURED TAGS INTERFACE
// ==========================================

/**
 * Structured tags interface for video content
 */
export interface VideoStructuredTags {
  /** Single pillar association (optional) */
  pillar?: PillarTag;
  /** Multiple system associations */
  systems: SystemTag[];
  /** Target user types */
  userTypes: UserTypeTag[];
  /** Angle marker associations for position-specific training */
  angleMarkers: AngleMarkerTag[];
  /** Architecture/complexity level (optional) */
  archLevel?: ArchLevelTag;
}

// ==========================================
// TAG CONSTANTS
// ==========================================

/** All available system tags */
export const SYSTEM_TAGS: SystemTag[] = ['7AMS', '6ZS', '4LAS', 'Box', 'General'];

/** All available user type tags */
export const USER_TYPE_TAGS: UserTypeTag[] = ['goalie', 'parent', 'coach'];

/** All available angle marker tags */
export const ANGLE_MARKER_TAGS: AngleMarkerTag[] = ['AM1', 'AM2', 'AM3', 'AM4', 'AM5', 'AM6', 'AM7'];

/** All available architecture level tags */
export const ARCH_LEVEL_TAGS: ArchLevelTag[] = ['L1', 'L2', 'L3', 'L4'];

// ==========================================
// TAG METADATA FOR UI DISPLAY
// ==========================================

/**
 * System tag metadata with names, descriptions, and colors
 */
export const SYSTEM_TAG_METADATA: Record<SystemTag, { name: string; description: string; color: string }> = {
  '7AMS': {
    name: '7-Angle Movement System',
    description: 'Movement patterns based on 7 angles from the net',
    color: 'blue',
  },
  // The key '6ZS' is a stored tag value and must not change — only the display
  // name is synced to the pillar list.
  '6ZS': {
    name: '6 Zone – 7 Point System™',
    description: 'Puck tracking methodology for visual acquisition',
    color: 'green',
  },
  '4LAS': {
    name: '4-Layer Awareness System',
    description: 'Peripheral awareness and zone recognition training',
    color: 'purple',
  },
  'Box': {
    name: 'Box Control System',
    description: 'Crease positioning and box control techniques',
    color: 'orange',
  },
  'General': {
    name: 'General',
    description: 'Non-system-specific content',
    color: 'gray',
  },
};

/**
 * User type tag metadata with names and icons
 */
export const USER_TYPE_TAG_METADATA: Record<UserTypeTag, { name: string; description: string; icon: string }> = {
  'goalie': {
    name: 'Goalie',
    description: 'Content designed for goaltenders',
    icon: 'Shield',
  },
  'parent': {
    name: 'Parent',
    description: 'Content for hockey parents supporting their goalie',
    icon: 'Users',
  },
  'coach': {
    name: 'Coach',
    description: 'Content for coaches working with goaltenders',
    icon: 'Clipboard',
  },
};

/**
 * Architecture level tag metadata with names and descriptions
 */
export const ARCH_LEVEL_TAG_METADATA: Record<ArchLevelTag, { name: string; description: string; color: string }> = {
  'L1': {
    name: 'Foundation',
    description: 'Introduction level - basic concepts and fundamentals',
    color: 'slate',
  },
  'L2': {
    name: 'Development',
    description: 'Building skills - intermediate concepts',
    color: 'blue',
  },
  'L3': {
    name: 'Refinement',
    description: 'Fine-tuning - advanced techniques',
    color: 'indigo',
  },
  'L4': {
    name: 'Mastery',
    description: 'Advanced level - expert-level content',
    color: 'purple',
  },
};

/**
 * Angle marker tag metadata with names and descriptions
 */
export const ANGLE_MARKER_TAG_METADATA: Record<AngleMarkerTag, { name: string; description: string; position: string }> = {
  'AM1': {
    name: 'Angle Marker 1',
    description: 'Post position - short side',
    position: 'Left Post',
  },
  'AM2': {
    name: 'Angle Marker 2',
    description: 'Near-post angle position',
    position: 'Left Hash',
  },
  'AM3': {
    name: 'Angle Marker 3',
    description: 'Inside-edge left position',
    position: 'Left Inside',
  },
  'AM4': {
    name: 'Angle Marker 4',
    description: 'Center/straight-on position',
    position: 'Center',
  },
  'AM5': {
    name: 'Angle Marker 5',
    description: 'Inside-edge right position',
    position: 'Right Inside',
  },
  'AM6': {
    name: 'Angle Marker 6',
    description: 'Near-post angle position',
    position: 'Right Hash',
  },
  'AM7': {
    name: 'Angle Marker 7',
    description: 'Post position - short side',
    position: 'Right Post',
  },
};

/**
 * Combined tag metadata object for convenience
 */
export const TAG_METADATA = {
  systems: SYSTEM_TAG_METADATA,
  userTypes: USER_TYPE_TAG_METADATA,
  archLevels: ARCH_LEVEL_TAG_METADATA,
  angleMarkers: ANGLE_MARKER_TAG_METADATA,
};

// ==========================================
// FILTER INTERFACE
// ==========================================

/**
 * Filter interface for querying videos by tags
 */
export interface VideoTagFilter {
  /** Filter by pillars (OR logic within category) */
  pillars?: PillarTag[];
  /** Filter by systems (OR logic within category) */
  systems?: SystemTag[];
  /** Filter by user types (OR logic within category) */
  userTypes?: UserTypeTag[];
  /** Filter by angle markers (OR logic within category) */
  angleMarkers?: AngleMarkerTag[];
  /** Filter by architecture levels (OR logic within category) */
  archLevels?: ArchLevelTag[];
}

/**
 * Facet count interface for filter UI
 */
export interface TagFacetCounts {
  pillars: Record<PillarTag, number>;
  systems: Record<SystemTag, number>;
  userTypes: Record<UserTypeTag, number>;
  angleMarkers: Record<AngleMarkerTag, number>;
  archLevels: Record<ArchLevelTag, number>;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Creates an empty structured tags object with initialized arrays
 */
export function createEmptyStructuredTags(): VideoStructuredTags {
  return {
    systems: [],
    userTypes: [],
    angleMarkers: [],
  };
}

/**
 * Builds a flattened tag index array for Firestore querying
 * Format: ['pillar:mindset', 'system:7AMS', 'user:goalie', 'am:AM1', 'level:L2']
 */
export function buildTagIndex(tags: VideoStructuredTags): string[] {
  const index: string[] = [];

  if (tags.pillar) {
    index.push(`pillar:${tags.pillar}`);
  }

  tags.systems.forEach((system) => {
    index.push(`system:${system}`);
  });

  tags.userTypes.forEach((userType) => {
    index.push(`user:${userType}`);
  });

  tags.angleMarkers.forEach((marker) => {
    index.push(`am:${marker}`);
  });

  if (tags.archLevel) {
    index.push(`level:${tags.archLevel}`);
  }

  return index;
}

/**
 * Parses a flattened tag index back into structured tags
 */
export function parseTagIndex(index: string[]): VideoStructuredTags {
  const tags = createEmptyStructuredTags();

  index.forEach((tag) => {
    const [prefix, value] = tag.split(':');
    switch (prefix) {
      case 'pillar':
        tags.pillar = value as PillarTag;
        break;
      case 'system':
        if (SYSTEM_TAGS.includes(value as SystemTag)) {
          tags.systems.push(value as SystemTag);
        }
        break;
      case 'user':
        if (USER_TYPE_TAGS.includes(value as UserTypeTag)) {
          tags.userTypes.push(value as UserTypeTag);
        }
        break;
      case 'am':
        if (ANGLE_MARKER_TAGS.includes(value as AngleMarkerTag)) {
          tags.angleMarkers.push(value as AngleMarkerTag);
        }
        break;
      case 'level':
        tags.archLevel = value as ArchLevelTag;
        break;
    }
  });

  return tags;
}

/**
 * Converts a VideoTagFilter to tag index format for querying
 */
export function filterToTagIndex(filter: VideoTagFilter): string[] {
  const index: string[] = [];

  filter.pillars?.forEach((pillar) => {
    index.push(`pillar:${pillar}`);
  });

  filter.systems?.forEach((system) => {
    index.push(`system:${system}`);
  });

  filter.userTypes?.forEach((userType) => {
    index.push(`user:${userType}`);
  });

  filter.angleMarkers?.forEach((marker) => {
    index.push(`am:${marker}`);
  });

  filter.archLevels?.forEach((level) => {
    index.push(`level:${level}`);
  });

  return index;
}

/**
 * Checks if a video matches a filter
 * Uses AND logic between categories, OR logic within categories
 */
export function matchesFilter(videoTags: VideoStructuredTags, filter: VideoTagFilter): boolean {
  // If no filter criteria, match all
  if (
    !filter.pillars?.length &&
    !filter.systems?.length &&
    !filter.userTypes?.length &&
    !filter.angleMarkers?.length &&
    !filter.archLevels?.length
  ) {
    return true;
  }

  // Check each filter category (AND logic between categories)

  // Pillar filter
  if (filter.pillars?.length) {
    if (!videoTags.pillar || !filter.pillars.includes(videoTags.pillar)) {
      return false;
    }
  }

  // Systems filter (OR within category)
  if (filter.systems?.length) {
    const hasMatchingSystem = filter.systems.some((system) =>
      videoTags.systems.includes(system)
    );
    if (!hasMatchingSystem) {
      return false;
    }
  }

  // User types filter (OR within category)
  if (filter.userTypes?.length) {
    const hasMatchingUserType = filter.userTypes.some((userType) =>
      videoTags.userTypes.includes(userType)
    );
    if (!hasMatchingUserType) {
      return false;
    }
  }

  // Angle markers filter (OR within category)
  if (filter.angleMarkers?.length) {
    const hasMatchingMarker = filter.angleMarkers.some((marker) =>
      videoTags.angleMarkers.includes(marker)
    );
    if (!hasMatchingMarker) {
      return false;
    }
  }

  // Architecture level filter
  if (filter.archLevels?.length) {
    if (!videoTags.archLevel || !filter.archLevels.includes(videoTags.archLevel)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets a display label for a system tag
 */
export function getSystemTagLabel(tag: SystemTag): string {
  return SYSTEM_TAG_METADATA[tag]?.name || tag;
}

/**
 * Gets a display label for a user type tag
 */
export function getUserTypeTagLabel(tag: UserTypeTag): string {
  return USER_TYPE_TAG_METADATA[tag]?.name || tag;
}

/**
 * Gets a display label for an architecture level tag
 */
export function getArchLevelTagLabel(tag: ArchLevelTag): string {
  return ARCH_LEVEL_TAG_METADATA[tag]?.name || tag;
}

/**
 * Gets a display label for an angle marker tag
 */
export function getAngleMarkerTagLabel(tag: AngleMarkerTag): string {
  return ANGLE_MARKER_TAG_METADATA[tag]?.position || tag;
}

/**
 * Gets a Tailwind color class for a system tag
 */
export function getSystemTagColorClass(tag: SystemTag): string {
  const color = SYSTEM_TAG_METADATA[tag]?.color || 'gray';
  return `bg-${color}-100 text-${color}-700 border-${color}-200`;
}

/**
 * Gets a Tailwind color class for an architecture level tag
 */
export function getArchLevelTagColorClass(tag: ArchLevelTag): string {
  const color = ARCH_LEVEL_TAG_METADATA[tag]?.color || 'gray';
  return `bg-${color}-100 text-${color}-700 border-${color}-200`;
}

/**
 * Counts total active tags in structured tags
 */
export function countTags(tags: VideoStructuredTags): number {
  let count = 0;
  if (tags.pillar) count++;
  count += tags.systems.length;
  count += tags.userTypes.length;
  count += tags.angleMarkers.length;
  if (tags.archLevel) count++;
  return count;
}

/**
 * Counts total active filters
 */
export function countActiveFilters(filter: VideoTagFilter): number {
  let count = 0;
  count += filter.pillars?.length || 0;
  count += filter.systems?.length || 0;
  count += filter.userTypes?.length || 0;
  count += filter.angleMarkers?.length || 0;
  count += filter.archLevels?.length || 0;
  return count;
}
