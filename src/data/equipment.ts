import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORIES,
  exercisesForEquipment,
  type EquipmentCategory,
  type EquipmentSlug,
} from "@/lib/equipment-catalog";
import type { EquipmentContent, EquipmentInfo, EquipmentSummary } from "@/lib/equipment-types";

/** Guide content for every catalogue entry; `parts` must cover every catalogue part id. */
const CONTENT: Record<EquipmentSlug, EquipmentContent> = {
  // ─────────────────────────── FREE WEIGHTS ───────────────────────────
  barbell: {
    summary: "The 20 kg bar behind squats, deadlifts, presses and rows — the backbone of strength training.",
    description:
      "A men's Olympic barbell is 2.2 m long and weighs 20 kg (44 lb) empty; the women's bar is 15 kg with a thinner grip. The ends (sleeves) spin independently of the shaft so the plates can rotate without twisting your wrists, and the knurling gives you grip without chalk. Because both hands share one bar, it lets you lift the heaviest loads and add weight in small, steady steps.",
    howToUse: {
      setup: [
        "Pick your bar: most gyms stock a 20 kg men's bar (28–29 mm grip) and a 15 kg women's bar (25 mm grip). Check the end cap or ask staff.",
        "For squats and presses, rack the bar at mid-chest height for squats or collarbone height for overhead press.",
        "Load plates largest first, with the same plates on each side, pushed all the way in to the inner collar.",
        "Lock a collar clip on each sleeve, tight against the last plate.",
      ],
      use: [
        "Take your grip using the smooth rings in the knurling as a guide, so both hands are the same distance from the centre.",
        "For squats and pulls, keep the bar over the middle of your foot so it travels in a straight vertical line.",
        "Brace before every rep: big breath into your belly, ribs down, tight grip.",
        "Lower under control. Only drop a bar loaded with bumper plates, on a lifting platform where dropping is allowed.",
        "Unload by alternating sides, one plate at a time, so the bar never tips.",
      ],
    },
    safety: [
      "Always use collars: plates that slide mid-lift make the bar tip suddenly.",
      "Squat and bench inside a rack with the safety arms set just below your lowest point, or with a spotter.",
      "Load and unload evenly so the bar can't flip out of the J-hooks.",
      "Pick plates up with a flat back and bent knees, and carry them close to your body.",
    ],
    commonMistakes: [
      "Mismatched plates on each side",
      "Skipping collars",
      "Uneven grip, with one hand closer to the centre",
      "Letting the bar drift forward, away from the mid-foot",
      "Dropping a bar loaded with iron plates",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "lower-back", "upper-back", "chest", "front-delts", "triceps", "traps", "abs"],
    specs: [
      { label: "Weight", value: "20 kg / 44 lb (women's bar 15 kg / 33 lb)" },
      { label: "Length", value: "2.2 m / 7.2 ft (women's 2.01 m)" },
      { label: "Grip diameter", value: "28–29 mm (women's 25 mm)" },
      { label: "Sleeve diameter", value: "50 mm / 2 in — fits Olympic plates" },
      { label: "Loadable sleeve", value: "About 41 cm / 16 in per side" },
    ],
    beginnerTip:
      "Start with the empty bar — 20 kg is already real weight. Nail the technique for a few sessions, then add 2.5–5 kg a week.",
    parts: {
      shaft:
        "The part you grip. The rough knurling bites into your palms so the bar doesn't slip, and the smooth rings cut into it help you place your hands symmetrically.",
      sleeve:
        "The thick ends that hold the plates. They spin separately from the shaft, so the bar doesn't twist in your hands as it moves.",
      plate:
        "Weight discs that slide onto the sleeves. Colour-coded bumper plates (red 25 kg, blue 20, yellow 15, green 10) can be dropped from overhead; iron plates should always be lowered.",
      collar: "Clips onto the sleeve outside the last plate so the plates can't slide off. Always use a pair.",
    },
  },

  dumbbells: {
    summary: "Fixed-weight pairs for presses, rows, curls and lunges — each side works on its own.",
    description:
      "Dumbbells let each arm move freely and independently, which evens out left–right imbalances and lets your joints follow their natural path. Most gyms have a rack of fixed pairs from 1–2 kg up to 40–50 kg in 2–2.5 kg steps. They're the most versatile tool in the gym and the easiest place for a beginner to start.",
    howToUse: {
      setup: [
        "Choose a pair you could lift for 2–3 more reps than your target. If your last reps get sloppy, go lighter.",
        "Lift them off the rack one at a time with a flat back: hinge at the hips and bend your knees, like a mini deadlift.",
        "Step away from the rack to a clear spot or bench so others can still reach the weights.",
        "For bench work, sit on the end of the bench with the dumbbells on your thighs, then kick them up with your knees as you lie back.",
      ],
      use: [
        "Grip the middle of the handle so the weight is balanced.",
        "Keep your wrists straight and stacked over your elbows when pressing.",
        "Move both arms at the same speed, or finish all reps on one side before switching for single-arm moves.",
        "Lower under control, and don't clang the dumbbells together at the top of presses.",
        "Put them back in the matching slot on the rack.",
      ],
    },
    safety: [
      "Keep a clear space around you — dumbbells swinging out to the side can hit people.",
      "Don't drop dumbbells after a set; bring them down to your thighs first, then to the floor.",
      "On older or adjustable dumbbells, check the heads are tight before lifting.",
      "Rack them after use, never leave them on the floor where someone can trip.",
    ],
    commonMistakes: [
      "Going too heavy and swinging the weight",
      "Dropping them at the end of a set",
      "Bending the wrists back under the load",
      "Training right in front of the rack, blocking others",
      "Returning them to the wrong slot",
    ],
    musclesTrained: ["chest", "front-delts", "side-delts", "biceps", "triceps", "upper-back", "lats", "quads", "glutes", "forearms"],
    specs: [
      { label: "Typical range", value: "1–50 kg / 2.5–110 lb per dumbbell" },
      { label: "Steps", value: "2–2.5 kg (5 lb) between pairs" },
      { label: "Handle", value: "About 30–33 mm thick, knurled" },
      { label: "Head shape", value: "Hexagonal (won't roll) or round" },
    ],
    beginnerTip:
      "It's normal for dumbbells to feel wobbly at first — that's your stabiliser muscles learning. Pick a lighter pair and focus on smooth, controlled reps.",
    parts: {
      handle:
        "The knurled grip between the heads. Hold it in the centre so the weight balances; the texture helps when your hands get sweaty.",
      head: "The weighted ends, usually rubber-coated hexagons that don't roll. The number on the end is the weight of one dumbbell, not the pair.",
      rack: "Where the pairs live, sorted lightest to heaviest. Return every pair to its labelled slot so the next person can find it.",
    },
  },

  kettlebell: {
    summary: "A cannonball with a handle, made for swings, goblet squats and full-body power.",
    description:
      "A kettlebell's weight sits below and in front of your hand, so it rewards explosive hip drive and challenges your grip and core in ways a dumbbell can't. Competition kettlebells are the same size at every weight; cast-iron ones get bigger as they get heavier. Common sizes run from 4 kg to 32 kg and beyond, usually in 4 kg steps.",
    howToUse: {
      setup: [
        "Pick a weight: a common starting point for swings is 8–12 kg for women and 12–16 kg for men. Go lighter while you learn.",
        "Clear about two metres around you, especially behind and in front.",
        "Set the bell on the floor about a foot in front of your toes, handle turned sideways.",
        "Make sure your hands and the handle are dry; chalk helps for high-rep sets.",
      ],
      use: [
        "Hinge at the hips with a flat back and grab the handle with both hands.",
        "Hike it back between your legs like a football snap, then snap your hips forward to float it to chest height.",
        "Let it fall back, and only hinge once your forearms reach your inner thighs.",
        "For goblet squats, hold it by the horns at your chest with elbows pointing down.",
        "To finish, hike it back one last time and set it down in front of you — never drop it.",
      ],
    },
    safety: [
      "Power comes from your hips, not your arms or lower back: keep your back flat and drive with your glutes.",
      "Check behind and in front of you before every set; never swing near people or mirrors.",
      "Stop the set as soon as your grip starts to fail.",
      "On cleans and presses keep your wrist straight, so the bell rests on your forearm instead of slamming it.",
    ],
    commonMistakes: [
      "Squatting the swing instead of hinging",
      "Lifting the bell with your arms and shoulders",
      "Leaning back at the top",
      "Letting the bell drag you forward on the backswing",
      "Death-gripping on cleans so the bell flips and bangs your wrist",
    ],
    musclesTrained: ["glutes", "hamstrings", "lower-back", "abs", "forearms", "traps", "quads", "front-delts"],
    specs: [
      { label: "Common weights", value: "8, 12, 16, 20, 24 kg (18–53 lb)" },
      { label: "Competition bell", value: "21 cm wide at every weight" },
      { label: "Handle", value: "About 33–35 mm thick, smooth" },
    ],
    beginnerTip:
      "Learn the hip hinge first: stand a foot in front of a wall and push your hips back to touch it without bending your knees much. That's the motion behind every swing.",
    parts: {
      handle:
        "The top bar you grip with one or two hands. It's smooth, unlike a barbell, so it can rotate in your hand during swings and cleans.",
      horns: "The vertical sides of the handle. Holding the horns is the grip for goblet squats and presses close to the chest.",
      bell: "The iron ball that carries the weight. Its centre of mass sits below your hand, which is why the kettlebell swings so naturally.",
    },
  },

  "ez-curl-bar": {
    summary: "A short bar with zig-zag bends that makes curls and skull crushers easier on your wrists.",
    description:
      "The EZ bar's angled grips turn your hands slightly inward, which takes strain off your wrists and elbows compared with a straight bar. It's a staple for biceps curls, lying triceps extensions (skull crushers), preacher curls and upright rows. Empty weights vary by gym — usually 7–12 kg — so check the end cap.",
    howToUse: {
      setup: [
        "Check the empty bar weight — it's often around 10 kg, not 20 kg like an Olympic bar.",
        "Load small plates evenly on both sleeves and lock them with collars.",
        "Lift the bar from the floor or rack with a flat back, holding it on the bends.",
        "For skull crushers, sit on the end of a flat bench with the bar on your thighs before lying back.",
      ],
      use: [
        "Curls: hold the angled grips with palms up, elbows pinned to your sides, and curl without swinging your body.",
        "Skull crushers: hold the inner bends with arms straight over your shoulders, then bend only at the elbows to lower the bar towards your forehead.",
        "Let your wrists follow the angle of the grip rather than bending them back.",
        "Take 2–3 seconds to lower the bar on every rep.",
      ],
    },
    safety: [
      "Use collars — plates slide off the short sleeves quickly.",
      "Go light on skull crushers, and lower the bar just behind your head if the forehead position feels risky.",
      "Keep plates small; big plates on a short bar can hit your thighs on curls.",
    ],
    commonMistakes: [
      "Swinging your torso to curl more weight",
      "Letting the elbows drift forward, turning the curl into a front raise",
      "Flaring the elbows out on skull crushers",
      "Assuming the bar weighs 20 kg when adding up the load",
    ],
    musclesTrained: ["biceps", "triceps", "forearms", "side-delts", "front-delts"],
    specs: [
      { label: "Weight", value: "Usually 7–12 kg / 15–25 lb — check the bar" },
      { label: "Length", value: "About 1.2 m / 47 in" },
      { label: "Sleeves", value: "50 mm Olympic or 25–30 mm standard plates" },
    ],
    beginnerTip:
      "Start with just the bar for 2–3 sets of curls. The EZ bar is short and light, so small jumps with 1.25 kg plates are your friend.",
    starterWorkout:
      "Arm finisher: 3 rounds of 10–12 EZ-bar curls followed by 10–12 skull crushers, resting 60 seconds between rounds.",
    parts: {
      camber:
        "The zig-zag bends in the middle. Holding the angled sections puts your wrists in a more natural half-turned position, easing strain on wrists and elbows.",
      sleeve: "Short loading ends for the plates. There's less room than on an Olympic bar, so it's built for light-to-moderate loads.",
      plate: "Small plates (1.25–10 kg) are usually all you need. Load both sides the same and finish with a collar.",
    },
  },

  // ───────────────────────── BENCHES & RACKS ─────────────────────────
  "flat-bench": {
    summary: "A stable padded bench for presses, rows, split squats and more.",
    description:
      "The flat bench is the most-used support in the gym: lie on it for presses and flys, kneel on it for single-arm rows, or rest your back foot on it for Bulgarian split squats. A good one stands about 43–45 cm high so you can plant your feet firmly while lying down, with a firm, grippy pad that doesn't slide.",
    howToUse: {
      setup: [
        "Move the bench to a clear spot, or centre it under the bar inside a rack for bench press.",
        "Press down on each end — it shouldn't rock. Move it if the floor is uneven.",
        "For barbell bench press, line up so your eyes are directly under the bar when you lie down.",
        "Wipe the pad before you start.",
      ],
      use: [
        "Lying down: feet flat on the floor, glutes, upper back and head on the pad.",
        "Squeeze your shoulder blades together and keep them pinned to the pad while you press.",
        "For single-arm rows, put the same-side knee and hand on the pad and keep your back flat.",
        "For split squats, rest the top of your back foot on the end of the pad.",
        "Wipe it down when you're done.",
      ],
    },
    safety: [
      "Keep the bench square under the bar — a skewed bench changes your bar path.",
      "Lie centred on the pad, not near the ends, so it can't tip.",
      "Only use it for step-ups if it's stable and rated for it; otherwise use a plyo box.",
      "Keep your feet on the floor when pressing for a stable base.",
    ],
    commonMistakes: [
      "Lying too far from, or too far under, the bar",
      "Lifting the hips off the pad during presses",
      "Training on a bench that rocks on uneven floor",
      "Leaving sweat on the pad",
    ],
    musclesTrained: ["chest", "triceps", "front-delts", "lats", "upper-back", "quads", "glutes"],
    specs: [
      { label: "Pad height", value: "About 43–45 cm / 17–18 in" },
      { label: "Pad width", value: "About 25–30 cm / 10–12 in" },
      { label: "Capacity", value: "Commercial benches: 300–450 kg / 660–1000 lb" },
    ],
    beginnerTip:
      "Before your first set, lie down and practise the setup with no weight: feet planted, shoulder blades squeezed, a slight arch. That position is half the lift.",
    parts: {
      pad: "Firm foam under grippy vinyl. It supports your head, upper back and hips so your shoulder blades can stay pinned while you press.",
      frame: "The steel spine and legs that carry you and the weight. Commercial frames are rated for several hundred kilos.",
      feet: "A wide base with rubber feet that stop the bench rocking or sliding on the floor.",
    },
  },

  "adjustable-bench": {
    summary: "A bench whose back tilts from flat to upright for incline presses, seated presses and curls.",
    description:
      "Changing the backrest angle changes the exercise: flat for bench press, about 30–45° for incline presses that target the upper chest, and upright for seated shoulder presses and curls. The seat usually tilts up too, so you don't slide down on inclines. Wheels on one end let you tip it up and roll it where you need it.",
    howToUse: {
      setup: [
        "Lift the bench by its handle end and roll it on its wheels to a clear space.",
        "Pull the pop-pin or lift the ladder bracket and set the backrest: 30–45° for incline, upright for seated presses.",
        "For inclines, raise the seat one notch so you don't slide down the pad.",
        "Push down firmly on the backrest to check it's locked before you sit.",
      ],
      use: [
        "Sit with your hips at the back of the seat and your upper back against the backrest.",
        "Plant your feet flat and wide for balance.",
        "Kick the dumbbells up with your knees one at a time as you lean back.",
        "When you're finished, lower the weights to your thighs and sit up before standing.",
        "Return the backrest to flat and roll the bench back.",
      ],
    },
    safety: [
      "Never adjust the angle with weights in your hands or while sitting on it.",
      "Check the pin is fully in, or the ladder bar is fully seated in its notch, before loading.",
      "Keep fingers clear of the ladder and hinge while adjusting.",
      "Make sure the wheels are off the floor so the bench can't roll while you train.",
    ],
    commonMistakes: [
      "Setting the incline too steep — past about 45° it becomes a shoulder press",
      "Forgetting to raise the seat, so you slide down",
      "Adjusting it with a dumbbell in your hand",
      "Leaving it at an odd angle for the next person",
    ],
    musclesTrained: ["chest", "front-delts", "triceps", "side-delts", "biceps"],
    specs: [
      { label: "Backrest range", value: "Flat (0°) to upright (85–90°); some decline to −15°" },
      { label: "Positions", value: "Typically 6–10 backrest settings" },
      { label: "Pad height", value: "About 43–45 cm / 17–18 in" },
    ],
    beginnerTip:
      "For incline dumbbell press, 30° is a sweet spot — steep enough to hit the upper chest without turning into a shoulder press.",
    parts: {
      backrest: "The long pad that tilts. Its angle decides which muscles work most: flatter for chest, steeper for shoulders.",
      seat: "Supports your hips. Tilt it up a notch on inclines so you don't slide down as you press.",
      ladder: "The notched bracket (or pop-pin) that locks the backrest angle. Make sure it clicks fully into a notch.",
      wheels: "Let you tip the bench onto one end and roll it. They should be off the floor while you train so the bench can't move.",
    },
  },

  "power-rack": {
    summary: "A steel cage that holds the bar and catches it if you fail — the safe place to squat and bench heavy.",
    description:
      "A power rack (or squat cage) has four uprights with numbered holes. J-hooks hold the bar at your starting height, and safety arms run inside the rack to catch a failed rep, so you can squat, bench and press heavy without a spotter. Most racks also have a pull-up bar on top and pegs to store plates.",
    howToUse: {
      setup: [
        "Set the J-hooks so the bar sits at mid-chest for squats (you unrack with a slight knee bend) or collarbone height for overhead press.",
        "Set the safety arms just below the bottom of your lift: under your squat depth, or just below your chest for bench press.",
        "Do a test rep with the empty bar to check both heights.",
        "Load plates evenly, then add collars.",
      ],
      use: [
        "Step under the bar, set your grip and position, then stand up to lift it off the hooks.",
        "Take one or two small steps back — no more — and set your feet.",
        "If you can't finish a rep, lower the bar under control onto the safety arms and slide out.",
        "To re-rack, walk the bar forward until it touches the uprights, then lower it into the hooks.",
        "Strip plates evenly from both sides and return them to the storage pegs.",
      ],
    },
    safety: [
      "Set the safety arms for squats and bench every time, even on light days.",
      "Make sure both J-hooks are in the same hole number and fully seated.",
      "Re-rack by touching the uprights first, then lowering — don't aim straight for the hooks.",
      "Never strip one side completely while the bar is on the hooks: it can flip.",
    ],
    commonMistakes: [
      "J-hooks too high (tiptoeing to unrack) or too low (half-squatting to unrack)",
      "Safety arms not set, or set too high to reach depth",
      "Walking the bar out too far",
      "Leaving plates on the bar when you're done",
    ],
    musclesTrained: ["quads", "glutes", "chest", "front-delts", "triceps", "lats", "biceps", "abs", "lower-back", "hamstrings"],
    specs: [
      { label: "Height", value: "About 2.1–2.4 m / 7–8 ft" },
      { label: "Hole spacing", value: "Usually 5 cm / 2 in (2.5 cm / 1 in in the bench zone on some racks)" },
      { label: "Uprights", value: "7.5 × 7.5 cm / 3 × 3 in steel" },
      { label: "Capacity", value: "Often 450–700 kg / 1000–1500 lb" },
    ],
    beginnerTip:
      "Note the hole numbers where you set the J-hooks and safeties and keep them in your training log. Next session, setup takes 30 seconds.",
    parts: {
      uprights: "The four steel posts. The numbered holes let you set the hooks and safeties at exactly the same height on both sides.",
      "j-hooks": "Hold the bar between sets. Set them so you unrack with a small knee bend, not on tiptoes.",
      "safety-arms":
        "Horizontal bars (or straps) that catch the bar if you can't finish a rep. Set them just below the bottom of your movement.",
      "pull-up-bar": "The crossbar across the top for pull-ups, chin-ups and hanging leg raises.",
      "plate-storage": "Pegs that keep plates close to where you load them, and add weight to steady the rack.",
    },
  },

  // ───────────────────────────── MACHINES ─────────────────────────────
  "cable-machine": {
    summary: "Two adjustable pulleys with weight stacks, giving constant tension from any angle.",
    description:
      "A cable crossover has a weight stack on each side, connected by steel cables to pulleys that slide up and down the columns. Because a cable pulls in whatever direction it points, you can train almost any muscle from almost any angle, and the tension stays on through the whole rep. Swap the attachment — rope, straight bar, D-handle — to change the exercise.",
    howToUse: {
      setup: [
        "Slide the pulley to the right height: high for pushdowns and crossovers, face height for face pulls, low for curls and raises.",
        "Clip the attachment you need onto the carabiner: rope for face pulls and pushdowns, D-handle for single-arm work, straight bar for curls.",
        "Pick your weight by pushing the selector pin fully into the plate you want.",
        "Step away from the column until the plates lift off the stack, so they stay off between reps.",
      ],
      use: [
        "Brace your core and set a stable stance — staggered feet work well for most moves.",
        "Move only at the working joints; the rest of your body stays still.",
        "Control the return so the plates never slam down.",
        "At the end of the set, step back towards the column to set the weight down gently.",
        "Unclip the attachment and hang it back on the rack.",
      ],
    },
    safety: [
      "Check the selector pin is pushed all the way in before you pull.",
      "Never let go of the handle with the stack raised — it will snap back.",
      "Check the cable isn't frayed and the carabiner is closed before use.",
      "Keep fingers, hair and loose clothing away from the pulleys and weight stack.",
    ],
    commonMistakes: [
      "Letting the stack crash between reps",
      "Leaning your body weight into it to move the load",
      "Standing too close, so the plates rest between reps",
      "Setting the pulley at the wrong height for the exercise",
    ],
    musclesTrained: ["chest", "triceps", "rear-delts", "upper-back", "biceps", "side-delts", "lats", "abs"],
    specs: [
      { label: "Weight stacks", value: "Typically 2 × 90–100 kg / 200–220 lb" },
      { label: "Plate steps", value: "2.5–5 kg / 5–10 lb" },
      { label: "Pulley ratio", value: "Often 2:1 — the handle feels about half the pinned weight" },
      { label: "Height positions", value: "Around 15–20 per column" },
    ],
    beginnerTip:
      "Cable numbers aren't comparable between machines because pulley ratios differ. Find a weight that feels right on the machine you use and track your progress on that one.",
    parts: {
      "weight-stack": "Stacked plates that provide the resistance. The selector pin decides how many of them you lift.",
      pin: "Slide it fully into the hole under the plate number you want — every plate above the pin rises with the cable.",
      pulley: "Slides up and down the column and locks with a pop-pin, setting the angle the cable pulls from.",
      handle: "Clips onto the cable with a carabiner. Swap between rope, D-handle and bars to change the grip and exercise.",
    },
  },

  "lat-pulldown": {
    summary: "A seated pull-down that builds a wide back and works you towards your first pull-up.",
    description:
      "The lat pulldown copies the pull-up, but you choose the resistance with a weight stack instead of lifting your whole body. A padded roller locks your thighs down so you can pull heavy without lifting off the seat. It's one of the best machines for the lats — the wide back muscles that give you a V-shape.",
    howToUse: {
      setup: [
        "Sit facing the machine and adjust the thigh pad so it presses snugly on top of your thighs with your feet flat on the floor.",
        "Set the weight with the pin — start light while you learn the movement.",
        "Stand up and take the bar with a grip a little wider than your shoulders, palms facing away.",
        "Sit down with the bar, sliding your thighs under the pad, arms straight overhead.",
      ],
      use: [
        "Lean back slightly (10–20°) with your chest up.",
        "Drive your elbows down and back to pull the bar to your upper chest.",
        "Squeeze your shoulder blades together for a moment at the bottom.",
        "Let the bar rise slowly until your arms are straight and you feel a stretch in your lats.",
        "When you're finished, stand up with the bar and guide it all the way up before letting go.",
      ],
    },
    safety: [
      "Always pull the bar to the front of your chest, never behind your neck.",
      "Keep the thigh pad snug so you don't get lifted off the seat.",
      "Never let go of the bar with the weight raised — guide it back up.",
      "Keep your head clear of the bar's path.",
    ],
    commonMistakes: [
      "Pulling behind the neck",
      "Leaning far back and turning it into a row",
      "Jerking the weight down with momentum",
      "Letting the weight yank your arms up at the top",
      "Thigh pad set too loose",
    ],
    musclesTrained: ["lats", "upper-back", "biceps", "rear-delts", "forearms", "abs"],
    specs: [
      { label: "Weight stack", value: "Typically 90–120 kg / 200–260 lb" },
      { label: "Plate steps", value: "Usually 5 kg / 10 lb" },
      { label: "Bar", value: "About 1.2 m / 48 in wide, with angled ends" },
    ],
    beginnerTip: "Pull with your elbows, not your hands: imagine driving your elbows into your back pockets.",
    parts: {
      bar: "The long bar with angled ends. A grip just outside shoulder width is standard; other handles can be clipped on instead.",
      "thigh-pad": "Rollers that pin your legs down. Set them to press firmly on your thighs so you can pull heavier without lifting off.",
      seat: "Sit tall with your feet flat. Some seats adjust in height so the thigh pad fits.",
      "weight-stack": "The plates the cable lifts as you pull. The number where the pin sits is your load.",
      pin: "Selects the weight. Push it all the way in and check it's secure before you start.",
    },
  },

  "smith-machine": {
    summary: "A barbell fixed on vertical rails, with hooks you can lock at any height.",
    description:
      "In a Smith machine the bar slides up and down on guide rails, so it can only move in a straight line. A turn of the wrists rotates the hooks onto pegs along the frame to rack the bar anywhere, and adjustable stops catch the bar if you fail. The fixed path feels stable, which helps beginners, but it also removes the balance work of a free barbell. Many Smith bars are counterbalanced, so the bar alone can weigh much less than 20 kg — check the label.",
    howToUse: {
      setup: [
        "Set the safety stops just below the lowest point of your lift.",
        "Position your bench or feet. For squats, put your feet slightly in front of the bar so you sit back into it.",
        "Load plates evenly and add collars.",
        "Check the frame's label for the bar's starting weight so you can track your load accurately.",
      ],
      use: [
        "Get into position under the bar and take your grip.",
        "Rotate your wrists to turn the hooks off the pegs.",
        "Perform each rep in a smooth, controlled line.",
        "To rack, rotate the hooks back onto the nearest peg — you can do this at any point in the lift.",
        "Check the bar is hooked before letting go.",
      ],
    },
    safety: [
      "Always set the safety stops: you can't dump the bar to the side like a free barbell.",
      "Make sure the hooks are fully on a peg before you release the bar.",
      "Position yourself so the fixed path suits your body rather than forcing your joints into it.",
      "Keep your fingers away from the hooks and pegs.",
    ],
    commonMistakes: [
      "Feet directly under the bar for squats, pushing the knees far forward",
      "Not setting the safety stops",
      "Letting go before the hooks are locked",
      "Expecting Smith machine numbers to transfer to free-barbell lifts",
    ],
    musclesTrained: ["quads", "glutes", "chest", "triceps", "front-delts", "hamstrings", "calves"],
    specs: [
      { label: "Starting bar weight", value: "Often 6–20 kg / 15–45 lb — check the label" },
      { label: "Rail angle", value: "Vertical, or angled about 7° on some models" },
      { label: "Bar", value: "Takes 50 mm Olympic plates" },
    ],
    beginnerTip:
      "A Smith machine is a good place to learn the feel of a loaded bar, but mix in free-barbell work over time so you build balance and stabiliser strength.",
    starterWorkout:
      "Lower-body starter: 3 × 10 Smith squats, 3 × 10 Smith hip thrusts (pad on the bar), 3 × 12 calf raises with the balls of your feet on a plate. Rest 90 seconds between sets.",
    parts: {
      bar: "Fixed to a carriage, so it can only slide straight up and down. It may be counterbalanced to feel lighter than a normal bar.",
      hooks: "Rotate them with a turn of your wrists to catch any peg on the frame and rack the bar at any height.",
      rails: "The vertical guides the bar runs on. They fix the path, so you don't need to balance the bar.",
      "safety-stops": "Adjustable stops near the bottom of the rails. Set them just below your lowest point to catch a failed rep.",
    },
  },

  "leg-press": {
    summary: "A seated sled you push with your legs, for heavy quad and glute work without loading your spine.",
    description:
      "On a 45° leg press you sit in a reclined seat and press a sliding sled loaded with plates. Your back is fully supported, so you can train your legs hard without balancing a bar on your shoulders. Foot position changes the focus: higher and wider on the platform works more glutes and hamstrings; lower and narrower works more quads. Because of the angle, you move only about 70% of the plate weight — and the sled itself adds weight too.",
    howToUse: {
      setup: [
        "Adjust the backrest so your knees are bent to about 90° when your feet are on the platform.",
        "Load plates evenly on the horns. Start light — the sled alone is often 40 kg or more.",
        "Sit with your hips and back flat against the pad, feet shoulder-width apart in the middle of the platform.",
        "Press the sled up slightly and rotate the safety handles out to release it.",
      ],
      use: [
        "Lower the sled slowly by bending your knees towards your chest, knees in line with your toes.",
        "Stop before your lower back starts to peel off the pad.",
        "Push through your whole foot to press the sled back up, stopping just short of locking your knees.",
        "After your last rep, turn the safety handles back in and lower the sled onto them.",
      ],
    },
    safety: [
      "Never snap your knees into a hard lockout at the top.",
      "Keep your hips and lower back on the pad — going too deep rounds your spine under load.",
      "Always re-engage the safety handles before getting out.",
      "Unload plates evenly and take them off when you're done.",
    ],
    commonMistakes: [
      "Locking the knees out",
      "Hips curling off the pad at the bottom",
      "Heels lifting off the platform",
      "Knees caving in",
      "Loading more weight than you can control through a full range",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "adductors", "calves"],
    specs: [
      { label: "Sled angle", value: "45°" },
      { label: "Effective load", value: "About 70% of the plates on the sled" },
      { label: "Sled weight", value: "Often 40–75 kg / 90–165 lb — check the label" },
      { label: "Plate horns", value: "4–6, for 50 mm Olympic plates" },
    ],
    beginnerTip:
      "Start with the empty sled and a depth where your lower back stays glued to the pad. Depth comes with mobility; piling on plates you can only half-rep is the classic leg-press mistake.",
    starterWorkout:
      "Leg finisher: 3 × 12 leg presses with feet mid-platform, then 2 × 15 calf presses with the balls of your feet on the bottom edge. Rest 90 seconds.",
    parts: {
      sled: "The carriage your feet push. It slides on rails and carries the plates.",
      platform: "Where your feet go. Feet high on it works more glutes and hamstrings; feet low works more quads.",
      seat: "The reclined seat and backrest that support your whole spine. Keep your hips and lower back pressed into it.",
      "safety-handles": "Levers beside the seat that lock the sled. Turn them out to start and back in to finish — never leave the sled unlocked.",
      "plate-horns": "Pegs on the sled that hold the plates. Load both sides evenly.",
    },
  },

  "leg-extension": {
    summary: "A seated machine that isolates the quads by straightening your knees against a padded lever.",
    description:
      "The leg extension is one of the few exercises that trains the quadriceps on their own, including the rectus femoris that squats hit less. You sit upright and straighten your knees against a pad resting on your lower shins. It's great for building the quads and for warming up your knees before squats, and the weight stack makes it easy to progress in small steps.",
    howToUse: {
      setup: [
        "Adjust the backrest so the backs of your knees sit at the front edge of the seat.",
        "Line up your knee joint with the machine's pivot, often marked with a coloured dot.",
        "Set the shin pad so it rests on your lower shins, just above your ankles.",
        "Choose a light weight with the pin and hold the side handles.",
      ],
      use: [
        "Sit tall with your back against the pad.",
        "Straighten your legs in one smooth motion until your knees are almost straight.",
        "Squeeze your quads for a second at the top.",
        "Lower over 2–3 seconds without letting the plates touch down between reps.",
      ],
    },
    safety: [
      "Line the pivot up with your knee — misalignment strains the joint.",
      "Use smooth, controlled reps rather than kicking the weight up.",
      "If your knees hurt, shorten the range and go lighter, and get it checked by a physio.",
    ],
    commonMistakes: [
      "Knees not lined up with the pivot",
      "Shin pad too high up the shin",
      "Kicking the weight up with momentum",
      "Lifting the hips off the seat",
      "Letting the weight drop quickly",
    ],
    musclesTrained: ["quads"],
    specs: [
      { label: "Weight stack", value: "Typically 70–100 kg / 150–220 lb" },
      { label: "Adjustments", value: "Backrest depth, shin pad height, start angle" },
    ],
    beginnerTip:
      "Pause for a one-second squeeze at the top of every rep. A lighter weight with a hard squeeze beats heavy, swinging reps.",
    starterWorkout:
      "Quad pump: 3 × 12–15 leg extensions with a one-second squeeze at the top and a three-second lowering. Rest 60 seconds.",
    parts: {
      seat: "Supports your hips and back. The backrest slides so the backs of your knees sit right at the front edge.",
      "shin-pad": "The roller you lift with your lower shins. Set it just above your ankles.",
      pivot: "The machine's hinge. Line it up with the side of your knee so the lever and your leg rotate around the same point.",
      "weight-stack": "The plates that provide the load. Choose the weight with the selector pin.",
    },
  },

  // ────────────────────────────── CARDIO ──────────────────────────────
  treadmill: {
    summary: "A motorised belt for walking, jogging, running and incline hikes at an exact pace.",
    description:
      "A treadmill lets you control exactly how fast and how steep you go, which makes it ideal for warm-ups, steady cardio and intervals. Incline walking — say 8–12% at a brisk pace — raises your heart rate with very little impact, and a 1% incline is a good match for running outdoors. Most gym treadmills reach 18–20 km/h and 12–15% incline, and the cushioned deck is kinder to your joints than pavement.",
    howToUse: {
      setup: [
        "Stand on the side rails, not the belt, before starting.",
        "Clip the safety key's cord to your clothing at waist height and check the key is in the console.",
        "Press Start (or Quick Start); the belt begins at a slow walk.",
        "Step onto the moving belt once it's turning at a slow walking speed.",
      ],
      use: [
        "Walk for 3–5 minutes to warm up before you raise the speed or incline.",
        "Stay in the middle of the belt, close to the console, looking forward.",
        "Change speed and incline in small steps using the console buttons.",
        "Let go of the handrails once you're comfortable — holding on reduces the workout and changes your stride.",
        "Cool down at a walk for a few minutes, press Stop and wait for the belt to halt before stepping off.",
      ],
    },
    safety: [
      "Always clip on the safety key: if you fall back, it pulls out and stops the belt.",
      "Never step off a moving belt — stop it first or step onto the side rails.",
      "Keep about 2 m of clear space behind the treadmill.",
      "Don't look back over your shoulder or down at your phone for long; drifting is how falls happen.",
    ],
    commonMistakes: [
      "Holding the handrails the whole time, especially on steep inclines",
      "Starting too fast",
      "Drifting to the back of the belt",
      "Stepping on or off while it's moving",
      "Overstriding and landing hard on your heels",
    ],
    musclesTrained: ["quads", "hamstrings", "glutes", "calves"],
    specs: [
      { label: "Speed", value: "Typically 0.8–20 km/h / 0.5–12 mph" },
      { label: "Incline", value: "0–15%" },
      { label: "Belt", value: "About 150 × 55 cm / 60 × 22 in" },
    ],
    beginnerTip:
      "Try an incline walk: 10% incline at 5 km/h for 20 minutes is tough cardio that's easy on your joints.",
    starterWorkout:
      "Beginner intervals: 5 min walking warm-up, then 6 rounds of 1 min jog + 2 min brisk walk, then 5 min easy walk.",
    parts: {
      belt: "The moving surface. Stay in the middle, towards the front; the side rails either side are for standing on when you start or stop.",
      console: "Shows speed, incline, time and distance, with quick buttons to change speed and incline or stop.",
      "safety-key": "A magnetic key on a cord you clip to your clothes. If you fall back, it pulls out and stops the belt instantly.",
      handrails: "For balance when getting on and off or changing settings — not for holding while you run. Many have heart-rate sensors.",
    },
  },

  "rowing-machine": {
    summary: "Full-body, low-impact cardio: legs push, body swings, arms pull.",
    description:
      "The rowing machine (ergometer) works your legs, back, core and arms in one smooth, low-impact movement — each stroke is roughly 60% legs, 20% core and 20% arms. The flywheel's air resistance rises the harder you pull, so you set the effort; the damper lever only changes how heavy each stroke feels. It's one of the best total-body conditioning tools in the gym.",
    howToUse: {
      setup: [
        "Sit on the seat and slide your feet into the footplates.",
        "Adjust the footplates so the strap crosses the widest part of your foot, then tighten it.",
        "Set the damper to 3–5 — like a smooth boat on water, not the heaviest setting.",
        "Take the handle with an overhand grip, hands about shoulder-width apart.",
      ],
      use: [
        "Start at the catch: shins vertical, arms straight, body leaning slightly forward from the hips.",
        "Drive: push with your legs first, then swing your body back slightly, then pull the handle to your lower ribs.",
        "Recover in reverse: arms out, body forward, then bend your knees to slide forward.",
        "Keep a rhythm of about one count on the drive and two on the recovery.",
        "Aim for 20–30 strokes per minute and watch your split time per 500 m on the monitor.",
      ],
    },
    safety: [
      "Keep your back straight and hinge from the hips — don't round your lower back to reach forward.",
      "Keep the handle level and never let it go; guide it back to its hook when you finish.",
      "Keep fingers clear of the chain and the flywheel housing.",
      "Strap in firmly so your feet can't slip out.",
    ],
    commonMistakes: [
      "Pulling with the arms before pushing with the legs",
      "Bending the knees before the handle has passed them on the recovery",
      "Setting the damper to 10, thinking it's a better workout",
      "Rushing the slide forward",
      "Hunching the back",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "lats", "upper-back", "biceps", "rear-delts", "abs", "lower-back", "calves"],
    specs: [
      { label: "Damper", value: "1–10 (3–5 recommended)" },
      { label: "Stroke rate", value: "20–30 strokes per minute for steady rowing" },
      { label: "Footprint", value: "About 2.4 × 0.6 m / 8 × 2 ft" },
      { label: "Monitor", value: "Split time per 500 m, watts, calories" },
    ],
    beginnerTip: "Remember the order: legs, body, arms on the way back — arms, body, legs on the way forward.",
    starterWorkout:
      "Learn to row: 5 min easy, then 5 × 1 min hard (24–26 strokes/min) with 1 min easy between, then 5 min easy.",
    parts: {
      handle: "Attached to the chain or strap. Hold it with relaxed fingers and pull it in to your lower ribs.",
      seat: "Slides along the rail as your legs push and bend. Sit tall on your sit bones.",
      footplates: "Adjustable footrests with straps. Set the strap across the widest part of your foot.",
      flywheel:
        "The fan inside the housing that creates resistance. The harder you pull, the more it resists; the damper changes how heavy each stroke feels.",
      rail: "The long monorail the seat rolls along. Keep it clear, and keep your hands off it.",
    },
  },

  "exercise-bike": {
    summary: "A stationary bike for low-impact cardio, from easy warm-ups to hard intervals.",
    description:
      "An exercise (spin) bike puts almost no impact through your joints, which makes it great for warm-ups, recovery days and anyone with knee or back niggles. A heavy flywheel keeps the pedals turning smoothly, and a resistance knob lets you dial the effort from an easy spin to a hard climb. Setting the saddle height correctly is the single most important thing for comfort and healthy knees.",
    howToUse: {
      setup: [
        "Stand beside the bike and set the saddle level with your hip bone.",
        "Sit on and check: with a pedal at the bottom, your knee should still be slightly bent.",
        "Slide the saddle forward or back so your knee is over the ball of your foot when the pedals are level.",
        "Set the handlebars level with or slightly above the saddle for a comfortable position.",
        "Put your feet in the cages (or clip in) and tighten the straps.",
      ],
      use: [
        "Warm up with light resistance for 5 minutes at 80–100 rpm.",
        "Add resistance a little at a time with the knob.",
        "Keep your upper body relaxed, your core engaged and your knees tracking over your feet.",
        "Only stand out of the saddle with at least moderate resistance, so the pedals support you.",
        "Cool down with a few easy minutes, then wipe the bike down.",
      ],
    },
    safety: [
      "Check every adjustment pin and lever is locked before you ride.",
      "On spin bikes the pedals keep turning with the flywheel — slow down with resistance or press the brake, never take your feet out while they spin.",
      "Don't stand up on the pedals with no resistance; you can lose your balance.",
      "Tighten the foot straps so your feet can't slip off.",
    ],
    commonMistakes: [
      "Saddle too low (pain at the front of the knee) or too high (hips rocking)",
      "Spinning fast with no resistance and bouncing in the saddle",
      "Gripping the handlebars hard and hunching",
      "Forgetting to wipe the bike down",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "calves"],
    specs: [
      { label: "Flywheel", value: "Often 15–22 kg / 33–48 lb on spin bikes" },
      { label: "Cadence", value: "60–110 rpm" },
      { label: "Adjustments", value: "Saddle height and reach, handlebar height" },
    ],
    beginnerTip:
      "If your hips rock side to side, the saddle is too high. If your knees ache at the front, it's probably too low.",
    starterWorkout: "Beginner ride: 5 min easy, then 5 × (1 min hard, 2 min easy), then a 5 min cool-down.",
    parts: {
      saddle: "The seat. Set its height level with your hip bone, then slide it so your knee sits over the pedal.",
      handlebars: "Adjustable for height and reach. Hold them lightly — they're for balance, not for taking your weight.",
      pedals: "Usually with toe cages and straps, often with a clip-in side for cycling shoes. Push through the ball of your foot.",
      resistance: "Turn it right to add resistance and left to ease off. On most spin bikes, pressing it down is the emergency brake.",
      flywheel: "The heavy wheel at the front. Its momentum keeps pedalling smooth; a magnet or brake pad on it creates resistance.",
    },
  },

  // ──────────────────────────── ACCESSORIES ───────────────────────────
  "exercise-mat": {
    summary: "A cushioned mat for floor work: core, stretching, glute bridges and push-ups.",
    description:
      "A gym mat protects your spine, knees and elbows from the hard floor during core work, stretching and bodyweight exercises. Thicker mats (10–15 mm) are comfortable for crunches and kneeling; thinner, grippier mats (4–6 mm) give a steadier base for standing and balance work. Take one from the mat rack and set up in a clear space away from the free weights.",
    howToUse: {
      setup: [
        "Take a mat from the rack and lay it flat in a clear area away from walkways and the free weights.",
        "Check it isn't slippery and give it a quick wipe.",
        "Leave room to stretch your arms and legs out fully.",
      ],
      use: [
        "Lie on it for core work and bridges so your spine and tailbone are cushioned.",
        "Kneel on it for kneeling push-ups, bird dogs and stretches.",
        "For planks and push-ups, put your hands or forearms on the mat for grip and comfort.",
        "Wipe it down and roll or hang it back on the rack when you're done.",
      ],
    },
    safety: [
      "Make sure the mat lies flat — curled edges are a trip hazard.",
      "Don't jump or balance on a thick, soft mat; it can roll your ankle.",
      "Keep it clear of areas where barbells and dumbbells are dropped.",
    ],
    commonMistakes: [
      "Not cleaning it after use",
      "Using a slippery mat for planks and push-ups",
      "Setting up in a walkway or in front of the dumbbell rack",
    ],
    musclesTrained: ["abs", "obliques", "glutes", "lower-back", "chest", "triceps"],
    specs: [
      { label: "Thickness", value: "4–15 mm" },
      { label: "Size", value: "About 180 × 60 cm / 72 × 24 in" },
    ],
    beginnerTip:
      "The mat is the perfect place to start: glute bridges, planks and dead bugs build the core strength every other lift relies on.",
    parts: {
      mat: "Dense foam that cushions your spine, knees and elbows and grips the floor. Thicker for comfort lying down, thinner for stability.",
    },
  },
};

/** URL-friendly category key, e.g. "Benches & racks" → "benches-racks". */
export function categorySlug(category: EquipmentCategory): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Accepts a category name (any case) or its slug. */
export function parseCategory(value: string | null | undefined): EquipmentCategory | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  return EQUIPMENT_CATEGORIES.find((c) => c.toLowerCase() === v || categorySlug(c) === v);
}

export const EQUIPMENT: EquipmentInfo[] = EQUIPMENT_CATALOG.map((entry) => {
  const { parts: partText, ...content } = CONTENT[entry.slug];
  return {
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    categorySlug: categorySlug(entry.category),
    ...content,
    parts: entry.parts.map((p) => ({ id: p.id, label: p.label, description: partText[p.id] ?? "" })),
    exercises: exercisesForEquipment(entry.slug),
  };
});

export function getEquipment(slug: string): EquipmentInfo | undefined {
  return EQUIPMENT.find((e) => e.slug === slug);
}

export function equipmentInCategory(category: EquipmentCategory): EquipmentInfo[] {
  return EQUIPMENT.filter((e) => e.category === category);
}

/** Every non-empty category with its equipment, in catalogue order. */
export function equipmentByCategory() {
  return EQUIPMENT_CATEGORIES.map((category) => ({
    category,
    slug: categorySlug(category),
    items: equipmentInCategory(category),
  })).filter((g) => g.items.length > 0);
}

/** Other equipment in the same category. */
export function relatedEquipment(e: EquipmentInfo, limit = 4): EquipmentInfo[] {
  return EQUIPMENT.filter((o) => o.category === e.category && o.slug !== e.slug).slice(0, limit);
}

export function summarizeEquipment(e: EquipmentInfo): EquipmentSummary {
  return {
    slug: e.slug,
    name: e.name,
    category: e.category,
    categorySlug: e.categorySlug,
    summary: e.summary,
    musclesTrained: e.musclesTrained,
    exercises: e.exercises,
    parts: e.parts.map(({ id, label }) => ({ id, label })),
  };
}
