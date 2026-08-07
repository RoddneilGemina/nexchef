export interface SmartRule {
  keywords: string[];
  defaultSeconds: number;
  minSafeSeconds: number;
  maxSafeSeconds: number;
  reason: string;
  warningText: string;
}

export interface CookingAction {
  id: string;
  label: string;
  icon: string; // Ionicons name
  defaultSeconds: number;
  category: 'prep' | 'heat';
  rules: SmartRule[];
}

export const MEASUREMENT_UNITS = [
  'g',
  'kg',
  'tbsp',
  'tsp',
  'cups',
  'ml',
  'l',
  'fl oz',
  'oz',
  'lb',
  'cloves',
  'pinch',
  'pcs',
  'slices',
  'whole',
  'handful',
  'dash',
  'to taste',
] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const COOKING_ACTIONS: CookingAction[] = [
  // --- PREP ACTIONS (Untimed Checklist Steps) ---
  {
    id: 'chop',
    label: 'Chop / Dice',
    icon: 'cut-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'slice',
    label: 'Slice / Julienne',
    icon: 'options-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'mix',
    label: 'Mix / Combine',
    icon: 'git-merge-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'whisk',
    label: 'Whisk / Beat',
    icon: 'sync-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'peel',
    label: 'Peel / Grate',
    icon: 'construct-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'marinate',
    label: 'Season / Marinate',
    icon: 'color-palette-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'measure',
    label: 'Measure / Weigh',
    icon: 'scale-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'wash',
    label: 'Wash / Rinse',
    icon: 'water-outline',
    category: 'prep',
    defaultSeconds: 0,
    rules: [],
  },
  {
    id: 'rest',
    label: 'Rest / Cool',
    icon: 'pause-circle-outline',
    category: 'prep',
    defaultSeconds: 300,
    rules: [
      {
        keywords: ['steak', 'meat', 'roast', 'pork', 'turkey'],
        defaultSeconds: 300,
        minSafeSeconds: 180,
        maxSafeSeconds: 900,
        reason: 'Resting meat allows internal juices to reabsorb.',
        warningText: 'Cutting meat immediately causes all delicious juices to leak out!',
      },
    ],
  },

  // --- ACTIVE HEAT ACTIONS (Precision Timed Steps) ---
  {
    id: 'saute',
    label: 'Sauté',
    icon: 'flame-outline',
    category: 'heat',
    defaultSeconds: 180, // 3 mins default
    rules: [
      {
        keywords: ['garlic', 'shallot', 'minced garlic', 'garlic cloves'],
        defaultSeconds: 30, // 30 seconds!
        minSafeSeconds: 15,
        maxSafeSeconds: 90,
        reason: 'Garlic browns and burns in seconds when sautéed.',
        warningText: 'Caution: Sautéing garlic over 1:30 will burn it and turn your dish bitter!',
      },
      {
        keywords: ['onion', 'onions', 'aromatics', 'leek'],
        defaultSeconds: 300, // 5 mins
        minSafeSeconds: 120,
        maxSafeSeconds: 900,
        reason: 'Onions need about 5 mins to soften and turn translucent.',
        warningText: 'Sautéing onions under 2 mins may leave them raw and crunchy.',
      },
      {
        keywords: ['mushroom', 'mushrooms'],
        defaultSeconds: 360, // 6 mins
        minSafeSeconds: 180,
        maxSafeSeconds: 720,
        reason: 'Mushrooms need time to release moisture and brown nicely.',
        warningText: 'Sautéing mushrooms for too short won’t caramelize them.',
      },
      {
        keywords: ['spinach', 'kale', 'greens'],
        defaultSeconds: 90, // 1.5 mins
        minSafeSeconds: 30,
        maxSafeSeconds: 240,
        reason: 'Leafy greens wilt very quickly in hot oil.',
        warningText: 'Greens sautéed over 3 mins will lose color and turn mushy.',
      },
    ],
  },
  {
    id: 'boil',
    label: 'Boil',
    icon: 'water-outline',
    category: 'heat',
    defaultSeconds: 480, // 8 mins default
    rules: [
      {
        keywords: ['pasta', 'spaghetti', 'penne', 'macaroni', 'noodles', 'ramen'],
        defaultSeconds: 480, // 8 mins
        minSafeSeconds: 360,
        maxSafeSeconds: 720,
        reason: 'Standard al dente pasta cooking time.',
        warningText: 'Boiling pasta for more than 12 mins makes it mushy.',
      },
      {
        keywords: ['egg', 'eggs', 'soft boil'],
        defaultSeconds: 360, // 6 mins soft boil
        minSafeSeconds: 240,
        maxSafeSeconds: 600,
        reason: '6 minutes yields a golden runny yolk soft-boiled egg.',
        warningText: 'Boiling eggs over 10 mins overcooks yolk with a grey ring.',
      },
      {
        keywords: ['potato', 'potatoes'],
        defaultSeconds: 900, // 15 mins
        minSafeSeconds: 600,
        maxSafeSeconds: 1500,
        reason: 'Cubed potatoes need ~15 mins to become fork-tender.',
        warningText: 'Potatoes boiled less than 10 mins will remain hard inside.',
      },
    ],
  },
  {
    id: 'sear',
    label: 'Sear',
    icon: 'restaurant-outline',
    category: 'heat',
    defaultSeconds: 180, // 3 mins
    rules: [
      {
        keywords: ['steak', 'beef', 'pork chop', 'ribeye', 'sirloin'],
        defaultSeconds: 180, // 3 mins per side
        minSafeSeconds: 60,
        maxSafeSeconds: 360,
        reason: 'High heat sear creates a delicious Maillard crust.',
        warningText: 'Searing meat over 6 mins per side may char the outer layer.',
      },
      {
        keywords: ['garlic'],
        defaultSeconds: 30,
        minSafeSeconds: 15,
        maxSafeSeconds: 60,
        reason: 'Garlic sears extremely fast!',
        warningText: 'Garlic seared over 1 min will scorch.',
      },
      {
        keywords: ['scallop', 'scallops', 'shrimp'],
        defaultSeconds: 120, // 2 mins
        minSafeSeconds: 60,
        maxSafeSeconds: 240,
        reason: 'Seafood sears in 1-2 minutes per side.',
        warningText: 'Seafood seared over 4 mins becomes rubbery.',
      },
    ],
  },
  {
    id: 'simmer',
    label: 'Simmer',
    icon: 'time-outline',
    category: 'heat',
    defaultSeconds: 900, // 15 mins
    rules: [
      {
        keywords: ['sauce', 'marinara', 'tomato', 'gravy', 'soup'],
        defaultSeconds: 900, // 15 mins
        minSafeSeconds: 300,
        maxSafeSeconds: 3600,
        reason: 'Simmering thickens sauces and melds flavors together.',
        warningText: 'Simmering under 5 mins won’t allow flavors to deepen.',
      },
      {
        keywords: ['rice', 'quinoa', 'grains'],
        defaultSeconds: 1080, // 18 mins
        minSafeSeconds: 720,
        maxSafeSeconds: 1500,
        reason: 'Covered simmer for white/jasmine rice is ~18 minutes.',
        warningText: 'Lifting lid or under-simmering rice leads to hard rice.',
      },
      {
        keywords: ['stew', 'curry', 'chili'],
        defaultSeconds: 1800, // 30 mins
        minSafeSeconds: 900,
        maxSafeSeconds: 7200,
        reason: 'Stews develop rich flavor with longer low-heat simmer.',
        warningText: 'Short simmering won’t tenderize tough cuts of meat.',
      },
    ],
  },
  {
    id: 'bake',
    label: 'Roast/Bake',
    icon: 'grid-outline',
    category: 'heat',
    defaultSeconds: 1200, // 20 mins
    rules: [
      {
        keywords: ['cookie', 'cookies', 'pastry'],
        defaultSeconds: 720, // 12 mins
        minSafeSeconds: 480,
        maxSafeSeconds: 1080,
        reason: 'Cookies bake fast at 350°F / 175°C.',
        warningText: 'Baking cookies over 18 mins will over-harden them.',
      },
      {
        keywords: ['chicken', 'poultry', 'thighs', 'breast'],
        defaultSeconds: 2100, // 35 mins
        minSafeSeconds: 1200,
        maxSafeSeconds: 3600,
        reason: 'Roasting chicken requires thorough cooking to 165°F.',
        warningText: 'Under-baking chicken carries food safety risks!',
      },
      {
        keywords: ['veggies', 'vegetables', 'carrot', 'broccoli', 'cauliflower'],
        defaultSeconds: 1500, // 25 mins
        minSafeSeconds: 900,
        maxSafeSeconds: 2400,
        reason: 'Roasting veggies caramelizes natural sugars.',
        warningText: 'Roasting veggies under 15 mins leaves them raw.',
      },
    ],
  },
  {
    id: 'fry',
    label: 'Fry',
    icon: 'fast-food-outline',
    category: 'heat',
    defaultSeconds: 360, // 6 mins
    rules: [
      {
        keywords: ['french fries', 'fries', 'potato'],
        defaultSeconds: 360, // 6 mins
        minSafeSeconds: 240,
        maxSafeSeconds: 600,
        reason: 'Deep frying fries takes ~5-6 minutes until golden.',
        warningText: 'Frying fries too long causes dark burnt edges.',
      },
      {
        keywords: ['chicken', 'wings', 'tender'],
        defaultSeconds: 480, // 8 mins
        minSafeSeconds: 360,
        maxSafeSeconds: 900,
        reason: 'Fried chicken needs 7-8 mins to cook safely through.',
        warningText: 'Frying under 6 mins may leave raw meat near the bone.',
      },
    ],
  },
  {
    id: 'steam',
    label: 'Steam',
    icon: 'cloud-outline',
    category: 'heat',
    defaultSeconds: 420, // 7 mins
    rules: [
      {
        keywords: ['dumpling', 'dumplings', 'dim sum', 'bao'],
        defaultSeconds: 600, // 10 mins
        minSafeSeconds: 480,
        maxSafeSeconds: 900,
        reason: 'Steaming dumplings takes 8-10 mins for dough and filling.',
        warningText: 'Steaming dumplings over 15 mins will make skin soggy.',
      },
      {
        keywords: ['broccoli', 'veggies', 'vegetable'],
        defaultSeconds: 300, // 5 mins
        minSafeSeconds: 180,
        maxSafeSeconds: 480,
        reason: 'Steaming veggies retains crisp green color & nutrients.',
        warningText: 'Steaming over 8 mins turns veggies dull and soft.',
      },
    ],
  },
];

export interface SmartRecommendationResult {
  recommendedSeconds: number;
  actionLabel: string;
  matchedKeyword?: string;
  reason: string;
  minSafeSeconds?: number;
  maxSafeSeconds?: number;
  warningText?: string;
}

/**
 * Analyzes action + step title/description/ingredients text to compute smart default duration & guardrails.
 */
export function getSmartRecommendation(
  actionId?: string,
  text?: string
): SmartRecommendationResult | null {
  if (!actionId && !text) return null;

  const action = COOKING_ACTIONS.find((a) => a.id === actionId);
  const normalizedText = (text || '').toLowerCase();

  if (action) {
    for (const rule of action.rules) {
      for (const kw of rule.keywords) {
        if (normalizedText.includes(kw)) {
          return {
            recommendedSeconds: rule.defaultSeconds,
            actionLabel: action.label,
            matchedKeyword: kw,
            reason: rule.reason,
            minSafeSeconds: rule.minSafeSeconds,
            maxSafeSeconds: rule.maxSafeSeconds,
            warningText: rule.warningText,
          };
        }
      }
    }

    return {
      recommendedSeconds: action.defaultSeconds,
      actionLabel: action.label,
      reason: `Standard default duration for ${action.label}.`,
    };
  }

  for (const act of COOKING_ACTIONS) {
    for (const rule of act.rules) {
      for (const kw of rule.keywords) {
        if (normalizedText.includes(kw)) {
          return {
            recommendedSeconds: rule.defaultSeconds,
            actionLabel: act.label,
            matchedKeyword: kw,
            reason: rule.reason,
            minSafeSeconds: rule.minSafeSeconds,
            maxSafeSeconds: rule.maxSafeSeconds,
            warningText: rule.warningText,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Check if the user's manual duration triggers an action-based guardrail warning
 */
export function checkActionGuardrails(
  actionId?: string,
  text?: string,
  durationInSeconds?: number
): { isWarning: boolean; message: string; isTooHigh: boolean } | null {
  if (!durationInSeconds || durationInSeconds <= 0) return null;

  const rec = getSmartRecommendation(actionId, text);
  if (!rec || (!rec.minSafeSeconds && !rec.maxSafeSeconds)) return null;

  if (rec.maxSafeSeconds && durationInSeconds > rec.maxSafeSeconds) {
    return {
      isWarning: true,
      message: rec.warningText || `Caution: ${durationInSeconds}s might be too long for ${rec.matchedKeyword ? rec.actionLabel + ' ' + rec.matchedKeyword : rec.actionLabel}.`,
      isTooHigh: true,
    };
  }

  if (rec.minSafeSeconds && durationInSeconds < rec.minSafeSeconds) {
    return {
      isWarning: true,
      message: `Note: ${durationInSeconds}s might be undercooked for ${rec.matchedKeyword ? rec.actionLabel + ' ' + rec.matchedKeyword : rec.actionLabel}. Recommended min: ${Math.floor(rec.minSafeSeconds / 60)}m ${rec.minSafeSeconds % 60}s.`,
      isTooHigh: false,
    };
  }

  return null;
}
