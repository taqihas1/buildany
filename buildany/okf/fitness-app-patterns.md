# OKF Entry — Fitness App Design Patterns
# Created: 2026-08-23
# Source: Competitive analysis of Strava, MyFitnessPal, Nike Training Club, Fitbit, Strong

---

## meta
- **version**: 1.0.0
- **domain**: fitness / health / workout
- **apps_analyzed**: Strava, MyFitnessPal, Nike Training Club, Fitbit, Strong
- **last_updated**: 2026-08-23
- **author**: TaqClaw (compiled via research)

---

## summary

This document captures common features, UI patterns, and data models from the top 5 fitness apps. Kelly MUST read this before generating any fitness-related project.

### App Positioning

| App | Primary Focus | Secondary Focus | Free Tier |
|-----|---------------|-----------------|-----------|
| **Strava** | GPS activity tracking (run/cycle) | Social feed, challenges, segments | Yes (limited segments) |
| **MyFitnessPal** | Nutrition/calorie tracking | Weight logging, macro goals, recipes | Yes (ads, limited macros) |
| **Nike Training Club** | Guided video workouts | Training plans, yoga, mobility | 100% free |
| **Fitbit** | Wearable device sync | Sleep tracking, heart rate, challenges | Yes (limited insights) |
| **Strong** | Weightlifting log (sets/reps) | Progress tracking, exercise library | Yes (limited routines) |

---

## common_features

### Across All 5 Apps
1. **Dashboard / Today Screen** — summary of today's stats at a glance
2. **Activity Logging** — record workouts, food, or activities
3. **Progress Charts** — visualize trends over time (week/month/year)
4. **Goal Setting** — daily/weekly targets for steps, calories, workouts
5. **Social Features** — friends, challenges, sharing achievements
6. **Streaks / Badges** — gamification to encourage consistency
7. **History / Timeline** — chronological log of past activities
8. **Settings / Profile** — personal info, units, preferences

### Unique Standouts

**Strava:**
- GPS route mapping with segment leaderboards
- Kudos system (social likes)
- Clubs and group challenges
- Beacon (live location sharing for safety)
- Photo uploads to activities

**MyFitnessPal:**
- Barcode scanner for food logging
- 14M+ food database
- Recipe importer from URL
- Macro breakdown (protein/carbs/fat) with pie chart
- Water tracking

**Nike Training Club:**
- Celebrity athlete workouts (Serena Williams, etc.)
- Video demonstrations for every exercise
- Filter by: duration, equipment, intensity, muscle group
- Multi-week training programs (2-6 weeks)
- Integration with Nike Run Club

**Fitbit:**
- Sleep stages tracking (deep, light, REM, awake)
- Heart rate zones and resting HR trends
- Automatic activity detection
- Challenges with friends (Daily Showdown, Workweek Hustle)
- Guided breathing exercises

**Strong:**
- Fast set/rep/weight logging (2 taps)
- Personal record (PR) tracking
- Exercise library with form descriptions
- Volume calculation over time
- CSV export for data portability

---

## ui_patterns

### Navigation Patterns

| Pattern | Used By | Description |
|---------|---------|-------------|
| **Bottom Tab Bar** | Strava, Fitbit, Strong | 3-5 tabs: Home/Today, Explore/Workouts, Community, Profile |
| **Top Tabs** | MyFitnessPal, Nike | Switch between views (e.g., Daily/Weekly in nutrition) |
| **Floating Action Button** | Fitbit, Strong | Quick-add button for logging workout/food |
| **Hamburger Menu** | All | Settings, goals, help, account |

### Dashboard / Home Screen Layout

```
┌─────────────────────────────────────┐
│  Header: Greeting + Streak Badge    │
├─────────────────────────────────────┤
│  Today's Summary Card               │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │  Steps  │ │ Calories│ │ Active │ │
│  │  8,432  │ │  2,100  │ │ 45 min │ │
│  └─────────┘ └─────────┘ └────────┘ │
├─────────────────────────────────────┤
│  Progress Ring / Circular Progress  │
│  [████████████░░░░] 68% of goal     │
├─────────────────────────────────────┤
│  Recent Activity List               │
│  - Morning Run • 5.2km • 32min      │
│  - Push Day • 12 sets • 45min       │
├─────────────────────────────────────┤
│  Today's Scheduled Workout          │
│  [Start Workout] Button             │
└─────────────────────────────────────┘
```

### Workout Detail Screen

```
┌─────────────────────────────────────┐
│  < Back    Morning Run        Edit  │
├─────────────────────────────────────┤
│  MAP VIEW (GPS route)               │
│  ┌─────────────────────────────┐    │
│  │    📍 ~~~~ route ~~~~ 📍    │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Distance│ │  Pace  │ │  Time  │   │
│  │ 5.2 km │ │5:12/km │ │ 27:02  │   │
│  └────────┘ └────────┘ └────────┘   │
├─────────────────────────────────────┤
│  Splits Table                       │
│  KM 1: 5:08  |  KM 2: 5:15         │
│  KM 3: 5:11  |  KM 4: 5:09         │
├─────────────────────────────────────┤
│  Elevation Profile Graph            │
│  Heart Rate Zones Graph             │
├─────────────────────────────────────┤
│  [▶] [💬] [👤] [🏆]                 │
│  Kudos Comments Athlete Segments    │
└─────────────────────────────────────┘
```

### Workout Logger (Strong-style)

```
┌─────────────────────────────────────┐
│  Push Day A          ⏱ 02:34      │
├─────────────────────────────────────┤
│  Bench Press                        │
│  ┌──────┬─────┬─────┬──────┐        │
│  │ Set  │ LBS │ Reps│ ✓   │        │
│  ├──────┼─────┼─────┼──────┤        │
│  │  1   │ 185 │  8  │ [✓] │        │
│  │  2   │ 185 │  8  │ [✓] │        │
│  │  3   │ 185 │  7  │ [✓] │        │
│  └──────┴─────┴─────┴──────┘        │
│  [+ Add Set]  PR: 185x8 🏆         │
├─────────────────────────────────────┤
│  Overhead Press                     │
│  ...                                │
├─────────────────────────────────────┤
│  [+ Add Exercise]                   │
│  [Finish Workout]                   │
└─────────────────────────────────────┘
```

### Nutrition Logger (MyFitnessPal-style)

```
┌─────────────────────────────────────┐
│  Today               ▼ August 23    │
├─────────────────────────────────────┤
│  Calories Remaining: 420            │
│  [████████████████░░░░] 1,580/2,000│
├─────────────────────────────────────┤
│  Breakfast          + 320 cal       │
│  ├─ Oatmeal        150 cal         │
│  ├─ Banana          90 cal         │
│  └─ Coffee          80 cal         │
├─────────────────────────────────────┤
│  Lunch              + 650 cal       │
│  ...                                │
├─────────────────────────────────────┤
│  Dinner              0 cal          │
│  Snacks              0 cal          │
├─────────────────────────────────────┤
│  [+ Add Food] [🔍 Scan Barcode]    │
│  Macros: P:120g  C:180g  F:55g      │
└─────────────────────────────────────┘
```

### Common Color Patterns
- **Primary Action**: Bright accent (Strava orange, Nike green, Fitbit teal)
- **Success/Complete**: Green checkmarks, filled rings
- **Progress**: Circular ring / linear bar, fills with color
- **Cards**: White/light on light gray background, subtle shadows
- **Charts**: Multi-line with clear legends, touch-to-see-values

---

## data_models

### User Profile
```typescript
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  goals: UserGoals;
  units: 'metric' | 'imperial';
  createdAt: Date;
}

interface UserGoals {
  dailySteps?: number;        // e.g., 10000
  weeklyWorkouts?: number;    // e.g., 4
  dailyCalories?: number;     // e.g., 2000
  weightGoalKg?: number;
  sleepHours?: number;        // e.g., 8
}
```

### Workout / Activity
```typescript
interface Workout {
  id: string;
  userId: string;
  type: 'run' | 'cycle' | 'swim' | 'strength' | 'yoga' | 'hiit' | 'custom';
  title: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  caloriesBurned?: number;
  notes?: string;
  
  // For cardio/GPS activities
  distanceMeters?: number;
  avgPace?: number;          // seconds per km
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGainMeters?: number;
  gpsRoute?: GPSPoint[];
  splits?: Split[];
  
  // For strength training
  exercises?: ExerciseSet[];
  totalVolume?: number;      // weight * reps summed
  prs?: PersonalRecord[];
  
  // For all
  rating?: number;           // 1-5 perceived effort
  photoUrls?: string[];
  createdAt: Date;
}

interface ExerciseSet {
  exerciseId: string;
  exerciseName: string;
  sets: {
    setNumber: number;
    weightKg: number;
    reps: number;
    rpe?: number;            // rate of perceived exertion 1-10
    completed: boolean;
  }[];
}
```

### Nutrition Entry
```typescript
interface NutritionLog {
  id: string;
  userId: string;
  date: Date;
  meals: Meal[];
  waterMl: number;
  summary: MacroSummary;
}

interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  totalCalories: number;
}

interface FoodItem {
  name: string;
  brand?: string;
  barcode?: string;
  servingSize: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

interface MacroSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  goalCalories: number;
  goalProteinG: number;
  goalCarbsG: number;
  goalFatG: number;
}
```

### Sleep Entry
```typescript
interface SleepLog {
  id: string;
  userId: string;
  date: Date;
  bedtime: Date;
  wakeTime: Date;
  durationMinutes: number;
  efficiency: number;        // 0-100%
  stages: {
    deepMinutes: number;
    lightMinutes: number;
    remMinutes: number;
    awakeMinutes: number;
  };
  heartRateAvg?: number;
  spo2Avg?: number;
  score?: number;            // Fitbit-style sleep score 0-100
}
```

### Social Features
```typescript
interface ActivityFeedItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'workout' | 'achievement' | 'challenge';
  workout?: WorkoutSummary;
  achievement?: Achievement;
  kudosCount: number;
  commentCount: number;
  comments: Comment[];
  createdAt: Date;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'steps' | 'distance' | 'workouts' | 'calories';
  target: number;
  startDate: Date;
  endDate: Date;
  participants: ChallengeParticipant[];
  createdBy: string;
}
```

---

## page_structure

### Minimum Viable Fitness App Pages

```
/home (Dashboard)
  - Today's summary cards
  - Progress rings
  - Recent activity feed
  - Quick actions (log workout, add food)

/workouts
  - Workout history list
  - Filter by type/date
  - Start new workout button

/workouts/[id]
  - Workout detail view
  - Stats, charts, maps
  - Edit/delete

/workouts/new
  - Workout type selector
  - Active logging interface
  - Timer / rest timer

/nutrition
  - Daily food diary
  - Meal sections
  - Macro summary
  - Water tracker

/nutrition/add
  - Search food database
  - Barcode scanner placeholder
  - Manual entry form

/progress
  - Charts over time
  - Stats summary
  - Goal progress

/social
  - Activity feed
  - Friends list
  - Challenges

/profile
  - User info
  - Goals settings
  - Units/preferences
  - Achievements/badges
```

---

## component_library

### Reusable Components for Fitness Apps

```typescript
// ProgressRing — circular progress indicator
interface ProgressRingProps {
  value: number;        // 0-100
  size: number;         // pixel diameter
  strokeWidth: number;
  color: string;
  label: string;
  sublabel?: string;
}

// StatCard — dashboard metric card
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}

// WorkoutListItem
interface WorkoutListItemProps {
  type: string;
  title: string;
  date: Date;
  duration: string;
  stats: { label: string; value: string }[];
  onClick: () => void;
}

// MacroBar — nutrition macro breakdown
interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
}

// ExerciseSetRow — strength training logger
interface ExerciseSetRowProps {
  setNumber: number;
  previousWeight?: number;
  previousReps?: number;
  weight: number;
  reps: number;
  completed: boolean;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  onToggleComplete: () => void;
}

// StreakBadge
interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  type: 'workouts' | 'steps' | 'logging';
}
```

---

## generation_guidelines

### When Kelly Generates a Fitness App

1. **Always include a Dashboard** with:
   - Today's summary (steps, calories, active minutes)
   - Progress toward daily goals
   - Quick action buttons
   - Recent activity feed

2. **Use realistic demo data**:
   - 7-14 days of sample workouts/entries
   - Varying intensities and types
   - Show progression over time

3. **Include these core pages**:
   - Dashboard (home)
   - Workout list + detail
   - Active workout logger (if strength-focused)
   - Progress/charts page
   - Profile/settings

4. **Color scheme**:
   - Pick ONE primary accent color (orange=energy, blue=trust, green=health)
   - Use it for primary buttons, progress fills, active states
   - Keep backgrounds light, cards white

5. **Charts to include**:
   - Weekly activity bar chart
   - Progress line chart (weight, pace, volume)
   - Macro pie/donut chart (nutrition apps)
   - Heart rate zone chart (cardio apps)

6. **Icons** (use lucide-react):
   - Activity: `Activity`, `Footprints`, `Timer`
   - Strength: `Dumbbell`, `TrendingUp`
   - Nutrition: `Apple`, `Droplets`, `Utensils`
   - Social: `Trophy`, `Users`, `Heart`

7. **Responsive considerations**:
   - Mobile-first layout
   - Bottom tab bar for mobile nav
   - Side nav for desktop
   - Touch-friendly tap targets (min 44px)

---

## references

- Strava: https://www.strava.com
- MyFitnessPal: https://www.myfitnesspal.com
- Nike Training Club: https://www.nike.com/ntc
- Fitbit: https://www.fitbit.com
- Strong: https://www.strong.app

---

## changelog

- **v1.0.0** (2026-08-23): Initial compilation from competitive analysis
