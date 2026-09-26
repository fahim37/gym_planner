/**
 * Gym vocabulary for search: what people type (slang, abbreviations, goals, split
 * days) mapped to the words the exercise library uses. Keys and values are
 * normalised text (see text.ts); a key may be several words ("leg day").
 */

export const STOP_WORDS = new Set([
  "a", "an", "and", "the", "for", "with", "to", "of", "on", "in", "at", "my", "me", "i", "is", "it", "that",
  "exercise", "exercises", "workout", "workouts", "move", "moves", "movement", "training", "train", "some",
  "good", "best", "great", "how", "do", "what", "which", "show", "want", "need", "like", "can", "you", "your",
  "using", "use", "by", "or", "from", "into", "get", "make", "help", "helps", "work", "works", "working", "out",
  "please", "any", "give", "find", "something", "stuff", "thing", "things", "way", "ways",
]);

/** Words written as one that the library writes as two ("pullup" → "pull up"). */
export const COMPOUNDS: Record<string, string> = {
  pullup: "pull up", pullups: "pull up", chinup: "chin up", chinups: "chin up", pushup: "push up", pushups: "push up",
  situp: "sit up", situps: "sit up", pulldown: "pull down", pulldowns: "pull down", pushdown: "push down",
  pushdowns: "push down", skullcrusher: "skull crusher", skullcrushers: "skull crusher", deadlifts: "deadlift",
  stepup: "step up", stepups: "step up", vup: "v up", vups: "v up", kettlebells: "kettlebell", dumbell: "dumbbell",
  dumbells: "dumbbell", barbel: "barbell", pecdeck: "pec deck", tbar: "t bar", ezbar: "ez bar", facepull: "face pull",
  facepulls: "face pull", hipthrust: "hip thrust", hipthrusts: "hip thrust", legpress: "leg press",
  goodmorning: "good morning", goodmornings: "good morning", jumpingjacks: "jumping jack", sixpack: "six pack",
};

/**
 * Query term → what it means in the library. Each value is a list of alternative
 * phrases; an exercise matching any of them matches the term.
 */
export const SYNONYMS: Record<string, string[]> = {
  // Muscles
  pec: ["chest"], pecs: ["chest"], pectoral: ["chest"], pectorals: ["chest"], boobs: ["chest"],
  "upper chest": ["incline chest"], "lower chest": ["decline chest", "chest dip"], "inner chest": ["squeeze", "fly"],
  lat: ["lats"], "latissimus": ["lats"], wings: ["lats"], "v taper": ["lats", "side delts"], "wide back": ["lats"],
  "wider back": ["lats"], "thick back": ["row", "upper back"], "thicker back": ["row", "upper back"],
  rhomboids: ["upper back"], rhomboid: ["upper back"], "mid back": ["upper back"], "middle back": ["upper back"],
  erectors: ["lower back"], "spinal erectors": ["lower back"], spine: ["lower back"], "back pain": ["lower back", "bird dog", "dead bug"],
  trap: ["traps"], trapezius: ["traps"], neck: ["traps", "shrug"],
  delt: ["delts", "shoulders"], delts: ["delts", "shoulders"], deltoid: ["delts", "shoulders"], deltoids: ["delts", "shoulders"],
  shoulder: ["shoulders"], "boulder shoulders": ["shoulders"], "capped shoulders": ["side delts"],
  "front delt": ["front delts"], "side delt": ["side delts"], "rear delt": ["rear delts"], "lateral delt": ["side delts"],
  "rear shoulder": ["rear delts"], "back of shoulder": ["rear delts"], "wide shoulders": ["side delts"],
  bi: ["biceps"], bis: ["biceps"], bicep: ["biceps"], guns: ["biceps", "triceps"], "big arms": ["biceps", "triceps"],
  "bigger arms": ["biceps", "triceps"], peak: ["biceps"], tri: ["triceps"], tris: ["triceps"], tricep: ["triceps"],
  "horseshoe": ["triceps"], arm: ["arms"], forearm: ["forearms"], grip: ["forearms", "grip"], wrist: ["forearms", "wrist"],
  "grip strength": ["forearms", "farmer", "hang"],
  ab: ["abs"], abdominals: ["abs"], abdominal: ["abs"], "six pack": ["abs"], stomach: ["abs", "core"], belly: ["abs", "core"],
  tummy: ["abs", "core"], "lower abs": ["leg raise", "reverse crunch"], "upper abs": ["crunch"], midsection: ["core"],
  "love handles": ["obliques"], "side abs": ["obliques"], oblique: ["obliques"], waist: ["obliques", "core"], "muffin top": ["obliques"],
  booty: ["glutes"], butt: ["glutes"], bum: ["glutes"], buttocks: ["glutes"], glute: ["glutes"], "bubble butt": ["glutes"],
  hips: ["glutes", "hip"], "hip flexor": ["hip flexor", "leg raise"], "hip flexors": ["hip flexor", "leg raise"],
  quad: ["quads"], quadriceps: ["quads"], thigh: ["quads", "hamstrings", "adductors"], thighs: ["quads", "hamstrings", "adductors"],
  "front thigh": ["quads"], "inner thigh": ["adductors"], "inner thighs": ["adductors"], "outer thigh": ["abduction", "glutes"],
  "outer thighs": ["abduction", "glutes"], adductor: ["adductors"], groin: ["adductors"], abductors: ["abduction"],
  ham: ["hamstrings"], hams: ["hamstrings"], hammies: ["hamstrings"], hamstring: ["hamstrings"], "back of leg": ["hamstrings"],
  calf: ["calves"], calfs: ["calves"], "lower leg": ["calves"], "lower legs": ["calves"], shins: ["calves"],
  leg: ["legs"], "lower body": ["legs"], "upper body": ["chest", "back", "shoulders", "arms"],
  // Split days
  "push day": ["chest", "shoulders", "triceps"], "pull day": ["back", "biceps", "lats"], "leg day": ["legs"],
  "arm day": ["arms"], "chest day": ["chest"], "back day": ["back"], "shoulder day": ["shoulders"], "core day": ["core"],
  "full body": ["compound"], "total body": ["compound"],
  // Equipment
  db: ["dumbbell"], dbs: ["dumbbell"], dumbbells: ["dumbbell"], dumbell: ["dumbbell"], weights: ["dumbbell", "barbell"],
  "free weights": ["dumbbell", "barbell"], bb: ["barbell"], "olympic bar": ["barbell"], kb: ["kettlebell"], kbs: ["kettlebell"],
  "kettle bell": ["kettlebell"], ez: ["ez bar"], "curl bar": ["ez bar"], "ez curl bar": ["ez bar"], cables: ["cable"],
  pulley: ["cable"], "cable machine": ["cable"], smith: ["smith machine"], machines: ["machine"], "gym machine": ["machine"],
  band: ["resistance band"], bands: ["resistance band"], "mini band": ["resistance band"], "med ball": ["medicine ball"],
  "slam ball": ["medicine ball"], box: ["plyo box", "box"], rope: ["rope"], ropes: ["battle ropes", "rope"],
  "skipping rope": ["jump rope"], "trap bar": ["trap bar"], "hex bar": ["trap bar"], "dip station": ["dip bars"],
  "pull up bar": ["pull up bar"], "chin up bar": ["pull up bar"], wheel: ["ab wheel"], "ab roller": ["ab wheel"],
  "no equipment": ["bodyweight"], "without equipment": ["bodyweight"], "body weight": ["bodyweight"], calisthenics: ["bodyweight"],
  home: ["bodyweight"], "at home": ["bodyweight"], "home workout": ["bodyweight"], hotel: ["bodyweight"], "no gym": ["bodyweight"],
  "no weights": ["bodyweight"], travel: ["bodyweight"],
  // Exercise names and gym shorthand
  ohp: ["overhead press"], "military press": ["overhead press"], "strict press": ["overhead press"], "shoulder press": ["shoulder press", "overhead press"],
  rdl: ["romanian deadlift"], rdls: ["romanian deadlift"], sldl: ["romanian deadlift"], "stiff leg deadlift": ["romanian deadlift"],
  "stiff leg": ["romanian deadlift"], dl: ["deadlift"], deads: ["deadlift"], deadlift: ["deadlift"], conventional: ["conventional deadlift"],
  bench: ["bench press", "bench"], bp: ["bench press"], "flat bench": ["bench press"], incline: ["incline"], decline: ["decline"],
  bss: ["bulgarian split squat"], bulgarian: ["bulgarian split squat"], "rear foot elevated": ["bulgarian split squat"],
  "skull crusher": ["skull crusher"], skulls: ["skull crusher"], "french press": ["skull crusher", "overhead triceps extension"],
  "lying triceps extension": ["skull crusher", "lying dumbbell triceps extension"], "press up": ["push up"], "press ups": ["push up"],
  "lat pull": ["lat pulldown"], "pull down": ["pulldown"], "face pull": ["face pull"], fly: ["fly"], flys: ["fly"], flyes: ["fly"],
  flies: ["fly"], "chest fly": ["fly", "cable crossover", "pec deck"], "pec fly": ["pec deck", "fly"], butterfly: ["pec deck"],
  crossover: ["cable crossover"], crossovers: ["cable crossover"], "rear delt fly": ["reverse fly", "reverse pec deck"],
  "reverse flyes": ["reverse fly"], shrugs: ["shrug"], "hip thrust": ["hip thrust", "glute bridge"], "glute thrust": ["hip thrust"],
  "hamstring curl": ["leg curl"], "hamstring curls": ["leg curl"], "leg curls": ["leg curl"], "quad extension": ["leg extension"],
  "knee extension": ["leg extension"], hack: ["hack squat"], clean: ["power clean"], cleans: ["power clean"], "olympic lift": ["power clean"],
  kickback: ["kickback"], "glute kickback": ["glute kickback", "donkey kick"], "hollow hold": ["hollow body hold"],
  "star jump": ["jumping jack"], "star jumps": ["jumping jack"], skipping: ["jump rope"], skip: ["jump rope"],
  run: ["treadmill run"], running: ["treadmill run"], jog: ["treadmill run"], jogging: ["treadmill run"], sprint: ["treadmill run", "high knees"],
  treadmill: ["treadmill"], cycling: ["stationary bike"], cycle: ["stationary bike"], bike: ["stationary bike"], spin: ["stationary bike"],
  rower: ["rowing machine"], erg: ["rowing machine"], "indoor rowing": ["rowing machine"], "farmers carry": ["farmers walk"],
  "farmer carry": ["farmers walk"], carry: ["farmers walk"], carries: ["farmers walk"], "loaded carry": ["farmers walk"],
  climbers: ["mountain climber"], swings: ["kettlebell swing"], "cable row": ["seated cable row"], "low row": ["seated cable row"],
  laterals: ["lateral raise"], "side raise": ["lateral raise"], "side raises": ["lateral raise"], "side lateral": ["lateral raise"],
  arnolds: ["arnold press"], preacher: ["preacher curl"], hammers: ["hammer curl"], "hammer curls": ["hammer curl"],
  "tricep extension": ["triceps extension"], "tricep pushdown": ["triceps pushdown"], "rope pushdown": ["triceps pushdown"],
  dips: ["dip"], "parallel bar dip": ["chest dip"], "wall squat": ["wall sit"], plank: ["plank"], planks: ["plank"],
  "superman hold": ["superman"], "back extension": ["back extension"], hyperextension: ["back extension"], hyperextensions: ["back extension"],
  hypers: ["back extension"], "romanian": ["romanian deadlift"], sumo: ["sumo"], goblet: ["goblet squat"],
  "air squat": ["bodyweight squat"], "front squat": ["front squat"], "back squat": ["back squat"],
  // Goals, style and level
  cardio: ["cardio"], conditioning: ["cardio", "plyometric"], hiit: ["cardio", "plyometric"], "fat burn": ["cardio"],
  "fat burning": ["cardio"], "fat loss": ["cardio"], "burn fat": ["cardio"], "lose weight": ["cardio"], "weight loss": ["cardio"],
  "lose belly fat": ["cardio", "abs"], endurance: ["cardio"], stamina: ["cardio"], "heart rate": ["cardio"], aerobic: ["cardio"],
  plyo: ["plyometric"], plyometrics: ["plyometric"], explosive: ["plyometric", "power clean", "jump"], jumping: ["jump", "plyometric"],
  power: ["plyometric", "power clean", "push press"], athletic: ["plyometric", "compound"], sports: ["plyometric", "compound"],
  stretch: ["stretch", "mobility"], stretches: ["stretch", "mobility"], stretching: ["stretch", "mobility"], mobility: ["mobility"],
  flexibility: ["stretch", "mobility"], flexible: ["stretch", "mobility"], "warm up": ["mobility", "cardio"], warmup: ["mobility", "cardio"],
  "cool down": ["stretch", "mobility"], cooldown: ["stretch", "mobility"], yoga: ["stretch", "mobility"], pilates: ["core", "abs"],
  recovery: ["stretch", "mobility"], tight: ["stretch"], stiff: ["stretch", "mobility"],
  posture: ["upper back", "rear delts", "face pull", "stretch"], "rounded shoulders": ["rear delts", "face pull", "chest stretch"],
  "desk job": ["stretch", "upper back", "hip flexor"], rehab: ["mobility", "beginner"], "knee friendly": ["glute bridge", "leg curl", "hip thrust"],
  "low impact": ["beginner", "machine"], "joint friendly": ["machine", "cable"],
  strength: ["strength", "compound"], strong: ["strength", "compound"], stronger: ["strength", "compound"], heavy: ["barbell", "compound"],
  powerlifting: ["squat", "bench press", "deadlift"], "big three": ["squat", "bench press", "deadlift"], "big 3": ["squat", "bench press", "deadlift"],
  mass: ["compound"], bulk: ["compound"], bulking: ["compound"], hypertrophy: ["compound", "isolation"], size: ["compound"],
  "build muscle": ["compound"], "muscle building": ["compound"], toning: ["isolation", "bodyweight"], tone: ["isolation", "bodyweight"],
  toned: ["isolation", "bodyweight"], beginner: ["beginner"], beginners: ["beginner"], easy: ["beginner"], newbie: ["beginner"],
  novice: ["beginner"], starter: ["beginner"], simple: ["beginner"], "first time": ["beginner"], intermediate: ["intermediate"],
  advanced: ["advanced"], hard: ["advanced"], difficult: ["advanced"], challenging: ["advanced"], expert: ["advanced"],
  "single joint": ["isolation"], "multi joint": ["compound"], unilateral: ["single"], "one arm": ["single arm"],
  "one leg": ["single leg"], "one sided": ["single"], balance: ["single leg", "core"], stability: ["core", "plank"],
  "anti rotation": ["pallof press", "plank"], rotation: ["twist", "woodchop"], twisting: ["twist", "woodchop"],
  hinge: ["deadlift", "swing", "good morning", "hip thrust"], "hip hinge": ["deadlift", "swing", "good morning"],
  "vertical pull": ["pull up", "pulldown"], "horizontal pull": ["row"], "vertical push": ["overhead press", "shoulder press"],
  "horizontal push": ["bench press", "push up"], squatting: ["squat"], lunging: ["lunge"],
};

/** Phrase keys of SYNONYMS (several words), longest first, for phrase detection. */
export const SYNONYM_PHRASES = Object.keys(SYNONYMS)
  .filter((k) => k.includes(" "))
  .sort((a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length);
