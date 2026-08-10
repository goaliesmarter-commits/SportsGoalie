import {
  Sport,
  Skill,
  Quiz,
  QuizQuestion,
  Achievement,
  AppSettings,
  DifficultyLevel,
  PILLARS,
} from '@/types';

/**
 * Pillar ID mapping — re-exported so seeding keeps one source of truth.
 *
 * This file used to keep its own copy, which still listed the retired
 * `training` pillar and knew nothing about Game, Practice or Lifestyle.
 */
export { PILLAR_IDS } from '@/lib/utils/pillars';
import { PILLAR_IDS } from '@/lib/utils/pillars';

/**
 * Map Tailwind color names to hex values
 */
const PILLAR_COLORS: Record<string, string> = {
  purple: '#9333EA',
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  red: '#EF4444',
  cyan: '#06B6D4',
  teal: '#14B8A6',
  pink: '#EC4899',
};

/**
 * The Ice Hockey Goalie Pillars - fixed set of learning pillars
 * These replace the generic "sports" with a structured goalie training system.
 * The list itself lives in PILLARS (src/types/onboarding.ts).
 */
export const sampleSports: Omit<Sport, 'id' | 'createdAt' | 'updatedAt' | 'skillsCount' | 'metadata' | 'createdBy'>[] = PILLARS.map((pillar, index) => ({
  name: pillar.name,
  description: pillar.description,
  icon: pillar.icon,
  color: PILLAR_COLORS[pillar.color] || '#3B82F6',
  category: 'Ice Hockey Goalie',
  difficulty: 'introduction' as DifficultyLevel,
  estimatedTimeToComplete: 120,
  imageUrl: undefined,
  tags: ['ice-hockey', 'goalie', pillar.slug, pillar.shortName.toLowerCase()],
  prerequisites: [],
  isActive: true,
  isFeatured: true,
  order: index + 1,
}));

/**
 * Get the fixed pillar ID for a given slug
 */
export function getPillarId(slug: keyof typeof PILLAR_IDS): string {
  return PILLAR_IDS[slug];
}

/**
 * Check if an ID is a valid pillar ID
 */
export function isPillarId(id: string): boolean {
  return Object.values(PILLAR_IDS).includes(id as typeof PILLAR_IDS[keyof typeof PILLAR_IDS]);
}

// Sample Skills Data (Basketball skills)
export const sampleSkills: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'metadata' | 'createdBy'>[] = [
  {
    sportId: '', // Will be filled with actual sport ID
    name: 'Basic Dribbling',
    description: 'Learn fundamental dribbling techniques including proper hand positioning, ball control, and basic moves.',
    difficulty: 'introduction' as DifficultyLevel,
    estimatedTimeToComplete: 30,
    content: '<h2>Basic Dribbling Fundamentals</h2><p>Dribbling is the foundation of basketball ball handling. Master these basics to build a strong foundation for advanced moves.</p><h3>Key Points:</h3><ul><li>Keep your head up</li><li>Use fingertips, not palm</li><li>Stay low and balanced</li><li>Practice with both hands</li></ul>',
    externalResources: [
      {
        id: '1',
        title: 'NBA Dribbling Fundamentals',
        url: 'https://www.nba.com/dribbling-fundamentals',
        type: 'website',
        description: 'Official NBA guide to dribbling basics',
      },
    ],
    media: {
      text: 'Watch these demonstration videos to see proper dribbling form.',
      images: [
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=600',
          alt: 'Player demonstrating proper dribbling stance',
          caption: 'Proper dribbling stance with low center of gravity',
          order: 1,
        },
      ],
      videos: [
        {
          id: '1',
          youtubeId: 'dQw4w9WgXcQ',
          title: 'Basic Dribbling Tutorial',
          duration: 420,
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
          order: 1,
        },
      ],
    },
    prerequisites: [],
    learningObjectives: [
      'Maintain proper dribbling form',
      'Dribble with both hands confidently',
      'Keep head up while dribbling',
      'Control the ball at different speeds',
    ],
    tags: ['fundamentals', 'ball-handling', 'introduction'],
    hasVideo: true,
    hasQuiz: true,
    isActive: true,
    order: 1,
  },
  {
    sportId: '', // Will be filled with actual sport ID
    name: 'Shooting Form',
    description: 'Master proper shooting mechanics including stance, grip, release, and follow-through for consistent accuracy.',
    difficulty: 'introduction' as DifficultyLevel,
    estimatedTimeToComplete: 45,
    content: '<h2>Shooting Form Fundamentals</h2><p>Proper shooting form is crucial for accuracy and consistency. Focus on these key elements to develop muscle memory.</p><h3>B.E.E.F. Method:</h3><ul><li><strong>Balance:</strong> Squared stance, feet shoulder-width apart</li><li><strong>Eyes:</strong> Focus on the rim</li><li><strong>Elbow:</strong> Under the ball, pointing to the rim</li><li><strong>Follow-through:</strong> Snap wrist down, fingers pointing to floor</li></ul>',
    externalResources: [
      {
        id: '1',
        title: 'Shooting Form Analysis',
        url: 'https://www.basketball-reference.com/shooting-form',
        type: 'website',
        description: 'Detailed breakdown of professional shooting techniques',
      },
    ],
    media: {
      text: 'Study the shooting motion frame by frame.',
      images: [
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1520207738-6b1b5eea1ad8?w=600',
          alt: 'Player demonstrating proper shooting form',
          caption: 'Perfect shooting form with proper arc and follow-through',
          order: 1,
        },
      ],
      videos: [
        {
          id: '1',
          youtubeId: 'dQw4w9WgXcQ',
          title: 'Perfect Shooting Form Tutorial',
          duration: 480,
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
          order: 1,
        },
      ],
    },
    prerequisites: [],
    learningObjectives: [
      'Demonstrate proper shooting stance',
      'Execute correct grip and release',
      'Maintain consistent follow-through',
      'Achieve 70% accuracy from free throw line',
    ],
    tags: ['shooting', 'fundamentals', 'accuracy'],
    hasVideo: true,
    hasQuiz: true,
    isActive: true,
    order: 2,
  },
  {
    sportId: '', // Will be filled with actual sport ID
    name: 'Defensive Stance',
    description: 'Learn proper defensive positioning, footwork, and techniques to become an effective defender.',
    difficulty: 'development' as DifficultyLevel,
    estimatedTimeToComplete: 40,
    content: '<h2>Defensive Fundamentals</h2><p>Great defense requires proper stance, active hands, and quick feet. Master these basics to shut down your opponent.</p><h3>Key Elements:</h3><ul><li>Low stance with wide base</li><li>Active hands up and out</li><li>Stay on balls of feet</li><li>Mirror the offensive player</li></ul>',
    externalResources: [
      {
        id: '1',
        title: 'Elite Defensive Techniques',
        url: 'https://www.espn.com/basketball-defense',
        type: 'website',
        description: 'Advanced defensive strategies from professional coaches',
      },
    ],
    media: {
      text: 'Watch how elite defenders position themselves.',
      images: [
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600',
          alt: 'Player in proper defensive stance',
          caption: 'Low defensive stance with active hands',
          order: 1,
        },
      ],
      videos: [
        {
          id: '1',
          youtubeId: 'dQw4w9WgXcQ',
          title: 'Defensive Stance and Movement',
          duration: 360,
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
          order: 1,
        },
      ],
    },
    prerequisites: ['1'], // Basic Dribbling skill ID
    learningObjectives: [
      'Maintain proper defensive stance',
      'Execute lateral movement drills',
      'Apply pressure without fouling',
      'Anticipate offensive moves',
    ],
    tags: ['defense', 'footwork', 'positioning'],
    hasVideo: true,
    hasQuiz: true,
    isActive: true,
    order: 3,
  },
];

// Sample Quiz Data
export const sampleQuizzes: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'metadata' | 'createdBy'>[] = [
  {
    skillId: '', // Will be filled with actual skill ID
    sportId: '', // Will be filled with actual sport ID
    title: 'Basic Dribbling Knowledge Check',
    description: 'Test your understanding of fundamental dribbling techniques and concepts.',
    category: 'Basketball',
    difficulty: 'introduction' as DifficultyLevel,
    tags: ['dribbling', 'fundamentals', 'basketball'],
    questions: [],
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      showExplanations: true,
      allowRetry: true,
      showCorrectAnswers: true,
      instantFeedback: true,
    },
    isActive: true,
    isPublished: true,
  },
  {
    skillId: '', // Will be filled with actual skill ID
    sportId: '', // Will be filled with actual sport ID
    title: 'Shooting Form Assessment',
    description: 'Evaluate your knowledge of proper shooting mechanics and techniques.',
    category: 'Basketball',
    difficulty: 'introduction' as DifficultyLevel,
    tags: ['shooting', 'form', 'basketball'],
    questions: [],
    settings: {
      shuffleQuestions: true,
      shuffleOptions: false,
      showExplanations: true,
      allowRetry: true,
      showCorrectAnswers: true,
      instantFeedback: true,
    },
    isActive: true,
    isPublished: true,
  },
];

// Sample Quiz Questions Data
export const sampleQuizQuestions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    quizId: '', // Will be filled with actual quiz ID
    type: 'multiple_choice',
    question: 'What part of your hand should you use when dribbling a basketball?',
    options: ['Palm', 'Fingertips', 'Knuckles', 'Whole hand'],
    correctAnswer: 'Fingertips',
    explanation: 'Using your fingertips gives you better control and feel for the ball, allowing for more precise dribbling.',
    points: 10,
    order: 1,
    difficulty: 'introduction' as DifficultyLevel,
    tags: ['dribbling', 'technique'],
  },
  {
    quizId: '', // Will be filled with actual quiz ID
    type: 'true_false',
    question: 'You should always keep your head down when dribbling to watch the ball.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'You should keep your head up to see the court, teammates, and defenders. Relying on feel and peripheral vision for the ball is crucial.',
    points: 10,
    order: 2,
    difficulty: 'introduction' as DifficultyLevel,
    tags: ['dribbling', 'awareness'],
  },
  {
    quizId: '', // Will be filled with actual quiz ID
    type: 'multiple_choice',
    question: 'What does the "E" in the B.E.E.F. shooting method stand for?',
    options: ['Effort', 'Eyes', 'Energy', 'Elevation'],
    correctAnswer: 'Eyes',
    explanation: 'In the B.E.E.F. method, "Eyes" refers to focusing your eyes on the rim throughout your shot.',
    points: 10,
    order: 1,
    difficulty: 'introduction' as DifficultyLevel,
    tags: ['shooting', 'technique'],
  },
  {
    quizId: '', // Will be filled with actual quiz ID
    type: 'multiple_choice',
    question: 'Where should your shooting elbow be positioned?',
    options: ['Pointing outward', 'Under the ball pointing to the rim', 'Against your side', 'Above your head'],
    correctAnswer: 'Under the ball pointing to the rim',
    explanation: 'Your elbow should be directly under the ball and pointing toward the rim for proper shooting alignment.',
    points: 10,
    order: 2,
    difficulty: 'introduction' as DifficultyLevel,
    tags: ['shooting', 'form'],
  },
];

// Sample Achievements Data
export const sampleAchievements: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>[] = [
  {
    name: 'First Steps',
    description: 'Complete your first skill in any sport',
    icon: '🎯',
    type: 'progress',
    criteria: {
      condition: 'skills_completed',
      value: 1,
    },
    points: 100,
    rarity: 'common',
    isActive: true,
    isSecret: false,
  },
  {
    name: 'Basketball Beginner',
    description: 'Complete 3 basketball skills',
    icon: '🏀',
    type: 'progress',
    criteria: {
      condition: 'sport_skills_completed',
      value: 3,
      sportId: '', // Will be filled with basketball sport ID
    },
    points: 250,
    rarity: 'common',
    isActive: true,
    isSecret: false,
  },
  {
    name: 'Quiz Master',
    description: 'Pass 10 quizzes with a score of 90% or higher',
    icon: '🎓',
    type: 'quiz',
    criteria: {
      condition: 'high_score_quizzes',
      value: 10,
    },
    points: 500,
    rarity: 'uncommon',
    isActive: true,
    isSecret: false,
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    type: 'streak',
    criteria: {
      condition: 'daily_streak',
      value: 7,
    },
    points: 300,
    rarity: 'uncommon',
    isActive: true,
    isSecret: false,
  },
  {
    name: 'Speed Learner',
    description: 'Complete a skill in under half the estimated time',
    icon: '⚡',
    type: 'time',
    criteria: {
      condition: 'fast_completion',
      value: 50, // 50% of estimated time
    },
    points: 200,
    rarity: 'rare',
    isActive: true,
    isSecret: false,
  },
  {
    name: 'Hidden Master',
    description: 'Unlock this secret achievement by completing all basketball skills with perfect quiz scores',
    icon: '🏆',
    type: 'special',
    criteria: {
      condition: 'perfect_sport_completion',
      value: 100,
      sportId: '', // Will be filled with basketball sport ID
    },
    points: 1000,
    rarity: 'legendary',
    isActive: true,
    isSecret: true,
  },
];

// Sample App Settings
export const sampleAppSettings: Omit<AppSettings, 'id' | 'updatedAt' | 'updatedBy'> = {
  maintenanceMode: false,
  featuresEnabled: {
    registration: true,
    quizzes: true,
    achievements: true,
    notifications: true,
    contentCreation: true,
    videoLearning: true,
    socialFeatures: false,
    analyticsTracking: true,
  },
  supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'zh'],
  maxQuizAttempts: 3,
  sessionTimeout: 30, // 30 minutes
  cacheSettings: {
    userDataTTL: 300000, // 5 minutes
    contentTTL: 600000, // 10 minutes
    quizTTL: 180000, // 3 minutes
    staticAssetsTTL: 86400000, // 24 hours
  },
  rateLimit: {
    apiCallsPerMinute: 60,
    quizAttemptsPerHour: 10,
    contentUploadPerDay: 5,
  },
  analytics: {
    trackPageViews: true,
    trackUserActions: true,
    trackPerformance: true,
    dataRetentionDays: 90,
  },
};

// Helper function to generate more sports with different categories
export function generateAdditionalSports(): typeof sampleSports {
  return [
    {
      name: 'Volleyball',
      description: 'Master serving, spiking, and team coordination in this dynamic indoor sport.',
      icon: '🏐',
      color: '#FF5722',
      category: 'Team Sports',
      difficulty: 'development' as DifficultyLevel,
      estimatedTimeToComplete: 35,
      imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
      tags: ['team-sport', 'indoor', 'jumping', 'coordination'],
      prerequisites: [],
      isActive: true,
      isFeatured: false,
      order: 7,
    },
    {
      name: 'Golf',
      description: 'Perfect your swing, putting, and course management in this precision sport.',
      icon: '⛳',
      color: '#4CAF50',
      category: 'Individual Sports',
      difficulty: 'development' as DifficultyLevel,
      estimatedTimeToComplete: 80,
      imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
      tags: ['individual-sport', 'outdoor', 'precision', 'mental-focus'],
      prerequisites: [],
      isActive: true,
      isFeatured: false,
      order: 8,
    },
    {
      name: 'Martial Arts',
      description: 'Develop discipline, technique, and self-defense skills through traditional martial arts training.',
      icon: '🥋',
      color: '#795548',
      category: 'Combat Sports',
      difficulty: 'refinement' as DifficultyLevel,
      estimatedTimeToComplete: 100,
      imageUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800',
      tags: ['combat', 'discipline', 'strength', 'flexibility'],
      prerequisites: [],
      isActive: true,
      isFeatured: false,
      order: 9,
    },
    {
      name: 'Running',
      description: 'Build endurance, speed, and proper running form for all distances.',
      icon: '🏃‍♂️',
      color: '#607D8B',
      category: 'Individual Sports',
      difficulty: 'introduction' as DifficultyLevel,
      estimatedTimeToComplete: 20,
      imageUrl: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800',
      tags: ['individual-sport', 'cardio', 'endurance', 'outdoor'],
      prerequisites: [],
      isActive: true,
      isFeatured: true,
      order: 10,
    },
  ];
}