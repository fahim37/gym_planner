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

  // ─────────────── Batch 2: the rest of a typical gym floor ───────────────
  "trap-bar": {
    summary: "A hexagonal bar you stand inside — the friendliest way to learn heavy deadlifts.",
    description:
      "The trap (or hex) bar lets you stand in the middle of the load with the handles at your sides, so the weight sits in line with your body instead of out in front of your shins. That makes deadlifts easier on the lower back and more quad-heavy, and it's also great for farmer's carries and shrugs. Most bars have two sets of handles: raised ones that shorten the pull and low ones that match a regular deadlift. Empty weights vary by model, typically 20–30 kg.",
    howToUse: {
      setup: [
        "Check the bar's own weight (often 20–30 kg) on the frame or ask staff — it's usually not the same as an Olympic bar.",
        "Load plates evenly on both sleeves and add collars.",
        "Start with the raised handles (a shorter pull); flip the bar over for the low handles once you're comfortable.",
        "Step into the centre of the frame, feet hip-width apart, with the handles in line with the middle of your feet.",
      ],
      use: [
        "Hinge at the hips and bend your knees to grip the centre of each handle, arms straight.",
        "Brace, lift your chest and push the floor away until you're standing tall.",
        "Finish by squeezing your glutes — don't lean back.",
        "Lower by pushing your hips back and bending your knees, keeping the plates level.",
        "Set it down gently so both sides touch the floor together.",
      ],
    },
    safety: [
      "Grip the handles in the centre; off-centre hands make the bar tip forward or back.",
      "Keep your back flat — the trap bar is kinder to your spine, not immune to rounding.",
      "Mind the frame corners when stepping in and out, especially when it's loaded.",
      "Use collars: plates slide easily on the long sleeves.",
    ],
    commonMistakes: [
      "Holding the handles off-centre so the bar tilts",
      "Standing too far forward or back inside the frame",
      "Dropping the hips so low that the chest folds forward",
      "Leaning back at the top instead of squeezing the glutes",
      "Forgetting the bar's own weight when logging the lift",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "lower-back", "traps", "forearms", "upper-back", "abs"],
    specs: [
      { label: "Weight", value: "Usually 20–30 kg / 45–65 lb — check the bar" },
      { label: "Handles", value: "Two heights on most bars — flip the bar to switch" },
      { label: "Sleeves", value: "50 mm / 2 in, for Olympic plates" },
    ],
    beginnerTip:
      "Start with the raised handles and light plates. It's the easiest deadlift variation to learn, and you'll pick up the hip hinge quickly.",
    starterWorkout:
      "Strength starter: 4 × 6 trap-bar deadlifts, then 3 × 30 m farmer's carries holding the bar. Rest 2 minutes between deadlift sets.",
    parts: {
      frame: "The hexagonal (or diamond) steel frame you stand inside. It keeps the load in line with your body rather than out in front.",
      handles: "Grips on the inside of the frame, often in a raised and a low set. The raised handles shorten the pull and are easier to start with.",
      sleeve: "The loading posts on each end for Olympic plates. Load both the same and lock the plates with collars.",
    },
  },

  "weight-plates": {
    summary: "The discs that load every bar and plate machine — bumpers for dropping, iron for everything else.",
    description:
      "Olympic plates have a 50 mm (2 in) hole and fit barbells, trap bars, EZ bars and plate-loaded machines. Bumper plates are solid rubber and all the same 450 mm diameter, so the bar sits at the same height whatever the weight and can be dropped on a lifting platform. Iron (or rubber-coated iron) plates are thinner, so more fits on the bar, but they're for lifts you lower under control. Plates with hand-grip cut-outs double as a training tool for front raises, pinch holds and carries.",
    howToUse: {
      setup: [
        "Find the weight you need on the plate tree and check the number — kg and lb plates look alike but aren't the same.",
        "Lift plates with both hands using the grip holes, knees bent and back flat.",
        "Carry them close to your body; only roll large bumpers along the floor, never across walkways.",
        "Slide each plate onto the sleeve, flat side facing in, and push it all the way to the inner collar.",
      ],
      use: [
        "Load the heaviest plates first (nearest the centre), then the smaller ones.",
        "Load and unload one plate per side at a time, alternating sides.",
        "Lock a collar on after the last plate.",
        "For plate-only moves (front raises, pinch holds, carries), grip the handles or the rim firmly.",
        "Put every plate back on the tree by size when you're done.",
      ],
    },
    safety: [
      "Don't drop iron plates or bars loaded with them — they bounce, crack and damage floors.",
      "Keep your toes clear when loading and unloading, and wear closed shoes.",
      "Never leave plates leaning against racks or benches where they can topple.",
      "Don't carry more than you can control — two trips beat a dropped plate.",
    ],
    commonMistakes: [
      "Mixing kg and lb plates without noticing",
      "Leaving plates on the bar or on the floor",
      "Loading small plates inside bigger ones",
      "Stripping one side completely while the bar sits on the hooks",
      "Lifting heavy plates with a rounded back",
    ],
    musclesTrained: ["forearms", "front-delts", "traps", "abs", "upper-back", "quads"],
    specs: [
      { label: "Hole", value: "50 mm / 2 in (Olympic)" },
      { label: "Bumper diameter", value: "450 mm / 17.7 in at every weight" },
      { label: "Common sizes", value: "1.25, 2.5, 5, 10, 15, 20, 25 kg" },
      { label: "Bumper colours", value: "Red 25, blue 20, yellow 15, green 10, white 5 kg" },
    ],
    beginnerTip:
      "Add up the total before every set: bar + both sides. Writing it as \"20 + 2 × 10 = 40 kg\" stops the classic mistake of one side ending up heavier.",
    starterWorkout:
      "Plate circuit: 3 rounds of 12 plate front raises, 10 goblet-style plate squats and a 30 m pinch-grip plate carry. Rest 60 seconds between rounds.",
    parts: {
      bumper:
        "Solid rubber plate with a steel hub. Every bumper has the same full diameter, so the bar sits at standard height and the rubber absorbs the shock if you drop the bar on a platform.",
      iron: "Thinner cast-iron (or rubber-coated) plate. More weight fits on the bar, but it must be lowered, never dropped.",
      tree: "The storage rack. Take plates from it and return them by size, heaviest at the bottom, so the tree stays balanced.",
    },
  },

  "medicine-ball": {
    summary: "A weighted ball for throws, slams and core work — train power by letting go.",
    description:
      "Medicine balls let you move fast and release the weight, which trains power (speed plus strength) in a way you can't safely do with a dumbbell. Bouncy rubber balls are for chest passes and rotational throws against a wall; soft slam balls and dead-bounce balls are for slamming into the floor. Most gyms stock 2–10 kg balls, plus larger, soft wall balls.",
    howToUse: {
      setup: [
        "Pick a weight you can throw fast: 2–4 kg for rotational throws, 4–6 kg for slams to start.",
        "Check the type: bouncy rubber balls rebound hard, so use a slam or dead-bounce ball for floor slams.",
        "Find a solid wall (brick or a marked throwing wall) and clear space around you.",
        "Stand about an arm's length plus a step from the wall for passes and throws.",
      ],
      use: [
        "Chest pass: hold the ball at your chest, step and push it into the wall, then catch it with soft elbows.",
        "Rotational throw: stand side-on, turn from your hips and throw the ball into the wall at waist height.",
        "Slam: reach overhead on your toes, then brace and throw it down just in front of your feet.",
        "Squat down with a flat back to pick it up between reps.",
        "Keep every rep sharp and fast — end the set when the speed drops.",
      ],
    },
    safety: [
      "Never slam a bouncy rubber ball — it can rebound into your face.",
      "Throw only against solid walls, never at mirrors, windows or people.",
      "Keep your fingers relaxed and your hands behind the ball when catching.",
      "Check the ball isn't split or leaking before you use it.",
    ],
    commonMistakes: [
      "Using a ball too heavy to move quickly",
      "Throwing with the arms only instead of the hips and legs",
      "Rounding the back to pick the ball up",
      "Slamming too close to your feet",
      "Standing too close to the wall to catch safely",
    ],
    musclesTrained: ["abs", "obliques", "chest", "front-delts", "triceps", "lats", "glutes", "quads"],
    specs: [
      { label: "Common weights", value: "2–10 kg / 4–22 lb" },
      { label: "Diameter", value: "About 23–35 cm / 9–14 in" },
      { label: "Types", value: "Bouncy rubber, dead-bounce slam ball, soft wall ball" },
    ],
    beginnerTip:
      "Go lighter than you think. A ball you can throw hard for 8 quick reps trains power; one you can only shove becomes slow strength work.",
    starterWorkout:
      "Power finisher: 3 rounds of 8 slams, 6 rotational wall throws each side and 10 chest passes. Rest 60 seconds between rounds.",
    parts: {
      shell: "The textured rubber or vinyl skin. Its grip pattern helps you hold and catch the ball with sweaty hands.",
      "weight-label": "The printed number is the ball's weight in kg or lb. Different weights often look identical, so check before you throw.",
    },
  },

  landmine: {
    summary: "One end of a barbell anchored to the floor, for angled presses, rows and rotations.",
    description:
      "A landmine is a pivot that holds one end of an Olympic bar so the other end moves in an arc. That angled path is easier on the shoulders than pressing straight overhead, and it lets you train presses, rows, squats and rotational core work with a single bar. Because the pivot supports part of the bar, the load you feel is well under the weight of the plates.",
    howToUse: {
      setup: [
        "Check the pivot is secure: bolted to a rack or platform, or with its base plate weighted down.",
        "Slide one end of an Olympic bar all the way into the pivot sleeve.",
        "Load plates on the free end only and add a collar.",
        "For rows, hook a V-handle under the bar end; for presses, hold the sleeve itself.",
      ],
      use: [
        "Press: face the bar end, hold it at your shoulder and press up and forward along the arc.",
        "Row: straddle the bar, hinge forward with a flat back and pull the handle to your belly.",
        "Rotation: hold the end with straight arms and swing it from side to side by turning your hips.",
        "Keep every rep smooth — the bar should never clank against the pivot.",
        "Lower the bar end gently to the floor when you finish.",
      ],
    },
    safety: [
      "Make sure the pivot can't slide: weight the base or use a rack attachment.",
      "Keep the arc around the loaded end clear — people walking past are the main hazard.",
      "Use a collar on the loaded end.",
      "Don't let go of the bar mid-air; it will crash to the floor.",
    ],
    commonMistakes: [
      "Standing too close, so the arc pushes you backwards",
      "Twisting from the lower back instead of the hips on rotations",
      "Loading plates on the pivot end",
      "Shrugging on presses",
      "Using an unsecured base that slides",
    ],
    musclesTrained: ["front-delts", "chest", "triceps", "upper-back", "lats", "obliques", "abs", "glutes", "quads"],
    specs: [
      { label: "Fits", value: "The sleeve of a standard Olympic bar" },
      { label: "Mounting", value: "Weighted floor plate or rack attachment" },
      { label: "Movement", value: "Swivels 360° and tilts" },
    ],
    beginnerTip:
      "Try the half-kneeling landmine press first. It's one of the most shoulder-friendly presses there is, and it teaches you to brace your core while you push.",
    starterWorkout:
      "Landmine circuit: 3 rounds of 8 single-arm presses each side, 10 V-handle rows and 8 rotations each side. Rest 90 seconds between rounds.",
    parts: {
      pivot: "The swivelling sleeve the bar end slots into. It lets the bar turn and tilt freely in any direction.",
      base: "The heavy plate or rack mount that holds the pivot. It must be secured or weighted so it can't slide.",
      "bar-end": "The free end of the barbell, loaded with plates. This is the end you press, row or rotate.",
      handle: "A V-shaped handle that hooks under the bar end for close-grip rows and presses.",
    },
  },

  "dip-station": {
    summary: "A tower for dips, pull-ups and hanging knee raises — a bodyweight gym in one frame.",
    description:
      "Often called a power tower or captain's chair, this station combines parallel dip bars, padded arm rests for knee and leg raises, and a pull-up bar on top. All three moves use your own bodyweight, so they grow with you, and they're some of the best exercises for the chest, triceps, back and core. Beginners can start with the arm rests and build up to full dips and pull-ups.",
    howToUse: {
      setup: [
        "Check the frame is stable and nothing is hanging from the bars.",
        "For dips, step onto the footrests and take the parallel bars with palms facing in.",
        "For knee raises, stand with your back against the pad, forearms on the arm pads and hands on the grips.",
        "For pull-ups, step up to reach the top bar and grip it just outside shoulder width.",
      ],
      use: [
        "Dips: press up to straight arms, lean slightly forward and lower until your upper arms are about parallel to the floor, then press back up.",
        "Knee raises: hang on your forearms, curl your knees up towards your chest, then lower slowly without swinging.",
        "Pull-ups: from a dead hang, drive your elbows down to pull your chest towards the bar, then lower all the way.",
        "Step down onto the footrests instead of dropping to the floor.",
      ],
    },
    safety: [
      "Don't dip deeper than your shoulders allow — stop when your upper arms reach parallel.",
      "Keep your shoulders down, away from your ears, in dips and hangs.",
      "Control every descent; dropping into the bottom of a dip strains the shoulders.",
      "Get on and off using the footrests rather than jumping.",
    ],
    commonMistakes: [
      "Sinking too deep in dips with the shoulders rolling forward",
      "Kipping or swinging for extra reps",
      "Swinging the legs up without curling the pelvis on knee raises",
      "Half-range pull-ups",
      "Flaring the elbows wide on dips",
    ],
    musclesTrained: ["chest", "triceps", "lats", "biceps", "abs", "front-delts", "upper-back", "obliques"],
    specs: [
      { label: "Height", value: "About 2.1–2.3 m / 7–7.5 ft" },
      { label: "Dip bar width", value: "About 50–60 cm / 20–24 in" },
      { label: "Capacity", value: "Commercial towers: often 150–180 kg / 330–400 lb" },
    ],
    beginnerTip:
      "Can't do a dip yet? Hold the top position for 10–20 seconds, then lower as slowly as you can. These \"negatives\" build dip strength fast.",
    starterWorkout:
      "Bodyweight trio: 3 rounds of 5–8 dips (or slow negatives), 8–12 knee raises and 3–6 pull-ups (or slow negatives). Rest 90 seconds.",
    parts: {
      "dip-bars": "Two parallel handles for dips. Grip them with palms facing each other and keep your elbows tucked.",
      "back-pad": "The upright pad you lean against for knee and leg raises. It stops your body swinging so your abs do the work.",
      "arm-pads": "Padded forearm rests with grips at the front. Support yourself on your forearms, shoulders down, for knee raises.",
      "pull-up-bar": "The bar across the top for pull-ups and chin-ups; many have angled ends for a palms-in grip.",
    },
  },

  "preacher-bench": {
    summary: "An angled arm pad that locks your upper arms in place for strict biceps curls.",
    description:
      "On a preacher bench your upper arms rest on a sloped pad, so you can't swing your body or drift your elbows forward to cheat the weight up. That isolates the biceps, especially in the stretched, bottom part of the curl. Use it with an EZ bar, a straight bar or dumbbells; the bar rest holds the bar so you don't have to pick it up from the floor.",
    howToUse: {
      setup: [
        "Adjust the seat so your armpits sit snugly over the top edge of the arm pad.",
        "Set the loaded EZ bar or barbell on the bar rest.",
        "Sit down and lay the backs of your upper arms flat on the pad.",
        "Take the bar with an underhand grip about shoulder-width apart.",
      ],
      use: [
        "Lift the bar off the rest and lower it until your arms are almost straight, keeping a slight bend.",
        "Curl the bar up by bending only at the elbows, upper arms staying on the pad.",
        "Squeeze just before your forearms reach vertical.",
        "Lower slowly, over about 3 seconds, back to the almost-straight position.",
        "Put the bar back on the rest at the top of your last rep.",
      ],
    },
    safety: [
      "Don't let the bar drop into fully locked elbows at the bottom — that's where biceps get strained.",
      "Start lighter than your standing curl; the stretched position is much harder.",
      "Keep your wrists straight.",
    ],
    commonMistakes: [
      "Seat set too low, so the elbows float off the pad",
      "Bouncing out of the bottom",
      "Lifting the hips or leaning back to finish reps",
      "Going too heavy",
    ],
    musclesTrained: ["biceps", "forearms"],
    specs: [
      { label: "Pad angle", value: "About 45°" },
      { label: "Seat", value: "Height-adjustable" },
      { label: "Use with", value: "EZ bar, straight bar or dumbbells" },
    ],
    beginnerTip:
      "Use about two-thirds of your standing-curl weight at first. The preacher removes all momentum, so the same weight feels much heavier.",
    starterWorkout:
      "Biceps focus: 3 × 10 EZ-bar preacher curls with a 3-second lowering, then 2 × 12 single-arm dumbbell preacher curls each side. Rest 60 seconds.",
    parts: {
      "arm-pad": "The sloped pad your upper arms rest on. It keeps your elbows fixed so your biceps do all the lifting.",
      seat: "Adjust it so your armpits sit right over the top edge of the arm pad — too low and your elbows lift off.",
      "bar-rest": "Hooks in front of the pad that hold the bar between sets, so you start and finish without lifting it from the floor.",
    },
  },

  "hyperextension-bench": {
    summary: "A 45° bench for back extensions that strengthen the lower back, glutes and hamstrings.",
    description:
      "On a back extension bench you lock your heels under the rollers, rest your hips on the pad and hinge forward from the hips, then lift back up to a straight line. It's one of the best ways to build the muscles that protect your lower back, and it trains the glutes and hamstrings without a barbell. Pad height decides the exercise: set it just below your hip crease so you can fold forward freely.",
    howToUse: {
      setup: [
        "Adjust the hip pad so its top edge sits just below your hip bones, at the crease of your hips.",
        "Stand on the footplate and hook your heels under the ankle rollers.",
        "Lean onto the pads so your body makes a straight line from head to heels.",
        "Cross your arms over your chest (hold a plate there later to add load).",
      ],
      use: [
        "Hinge from the hips to lower your upper body, keeping your back flat.",
        "Go down until you feel a stretch in your hamstrings.",
        "Squeeze your glutes to lift back up to a straight line — not beyond it.",
        "Move smoothly: about 2 seconds down, 1–2 seconds up.",
      ],
    },
    safety: [
      "Don't lift past a straight line; arching at the top squeezes the lower spine.",
      "Set the pad height correctly — too high and you can't hinge, so you round your back instead.",
      "Add weight only once 15 clean reps feel easy.",
    ],
    commonMistakes: [
      "Hip pad set too high, blocking the hinge",
      "Arching back past straight at the top",
      "Rounding the back instead of hinging at the hips",
      "Swinging up with momentum",
    ],
    musclesTrained: ["lower-back", "glutes", "hamstrings"],
    specs: [
      { label: "Angle", value: "45° (some benches are flat, at 90°)" },
      { label: "Adjustments", value: "Hip-pad height and footplate position" },
      { label: "Load", value: "Bodyweight, or hold a plate or dumbbell" },
    ],
    beginnerTip:
      "Think \"glutes, not back\": squeeze your bum to lift and stop when your body is straight. You'll feel it in your glutes and hamstrings as much as your lower back.",
    starterWorkout:
      "Back health: 3 × 12–15 bodyweight back extensions with a 1-second squeeze at the top. Rest 60 seconds.",
    parts: {
      "hip-pad": "Supports your hips and thighs. Set its top edge just below your hip crease so you can fold forward freely.",
      "ankle-rollers": "Padded rollers that lock your lower legs in place. Hook your heels under them before you lean forward.",
      footplate: "Where you stand. On many benches it slides to fit your height and keep the hip pad in the right spot.",
    },
  },

  "plyo-box": {
    summary: "A sturdy box for box jumps, step-ups and elevated push-ups — three heights in one.",
    description:
      "Plyo boxes are built to be jumped on. Most are three-in-one: turn the box over to change the height, commonly 50, 60 and 75 cm (20, 24 and 30 in). Foam boxes are forgiving on the shins if you clip the edge; wooden and steel boxes are firmer and more stable. Beyond jumps, they're perfect for step-ups, Bulgarian split squats, box squats and incline or decline push-ups.",
    howToUse: {
      setup: [
        "Pick a height you can clear easily — landing is the hard part, not jumping.",
        "Place the box on a flat, non-slip floor away from walls and other equipment.",
        "Turn it so the height you want is on top and check it doesn't rock.",
        "Stand about a foot's length away, facing the box.",
      ],
      use: [
        "Box jump: swing your arms back, dip into a quarter squat and jump, landing softly with both feet flat in the middle of the top.",
        "Stand up tall on the box, then step down one foot at a time — don't jump down.",
        "Step-up: put your whole foot on top, drive through that heel to stand up, and step back down under control.",
        "Reset between jumps; don't rebound from rep to rep until single jumps feel solid.",
      ],
    },
    safety: [
      "Step down rather than jumping down, to spare your Achilles tendons and knees.",
      "Stop when you're tired — most box-jump injuries come from missed jumps late in a set.",
      "Learn on a foam box or the lowest height.",
      "Never use a box that rocks or sits on a slippery floor.",
    ],
    commonMistakes: [
      "Choosing a box so high you land in a deep squat",
      "Landing on your toes or near the edge",
      "Jumping down between reps",
      "Knees caving in on landing",
      "Rushing reps when tired",
    ],
    musclesTrained: ["quads", "glutes", "calves", "hamstrings", "adductors"],
    specs: [
      { label: "Heights", value: "Usually 50 / 60 / 75 cm (20 / 24 / 30 in) on one box" },
      { label: "Materials", value: "Soft foam, wood or steel" },
      { label: "Top", value: "Grippy, non-slip surface" },
    ],
    beginnerTip:
      "Land in the same position you took off from: a quarter squat with knees over toes. If you land in a deep squat, the box is too high.",
    starterWorkout:
      "Jump starter: 4 × 3 box jumps on the lowest side (step down every rep), then 3 × 8 step-ups each leg. Rest 90 seconds.",
    parts: {
      top: "The flat landing surface, usually with a grippy finish. Land with both feet flat in the middle, not near the edge.",
      sides: "The box is a different height each way up. Turn it over to switch between its three heights; each side is usually labelled.",
    },
  },

  "pec-deck": {
    summary: "A seated fly machine: face out for chest flys, face the pad for rear-delt flys.",
    description:
      "The pec deck swings two arms in an arc in front of you, isolating the chest in a hugging motion without balancing dumbbells. Most modern machines double as a reverse fly: sit facing the pad, move the arms to the front position and open your arms out to train the rear delts and upper back. An adjustable start position controls how far you stretch.",
    howToUse: {
      setup: [
        "Adjust the seat so the handles sit at mid-chest height (shoulder height for rear-delt flys).",
        "Set the arms' start position so you feel a gentle stretch across the chest — no further.",
        "For rear-delt flys, sit facing the pad and move the arms to their front position.",
        "Select the weight with the pin.",
      ],
      use: [
        "Chest fly: sit tall with your back on the pad, hold the handles with slightly bent elbows and bring them together in front of your chest.",
        "Squeeze for a second, then let the arms open slowly until you feel the stretch.",
        "Rear-delt fly: chest against the pad, arms straight ahead, open your arms out and back until they line up with your body.",
        "Keep the same slight elbow bend throughout both moves.",
      ],
    },
    safety: [
      "Don't set the start position so wide that your shoulders are overstretched.",
      "Keep your shoulders down and back against the pad on chest flys.",
      "Let the weight return slowly — never slam the stack.",
    ],
    commonMistakes: [
      "Start position set too wide",
      "Bending and straightening the elbows, turning the fly into a press",
      "Shrugging the shoulders up",
      "Going so heavy you lose control of the stretch",
    ],
    musclesTrained: ["chest", "rear-delts", "front-delts", "upper-back"],
    specs: [
      { label: "Weight stack", value: "Typically 70–110 kg / 150–240 lb" },
      { label: "Adjustments", value: "Seat height and arm start position" },
      { label: "Modes", value: "Chest fly and rear-delt fly on dual machines" },
    ],
    beginnerTip: "Imagine hugging a big tree: arms slightly bent and fixed, with all the movement coming from your shoulders.",
    starterWorkout: "Upper-body pump: 3 × 12 pec deck flys, then 3 × 15 rear-delt flys on the same machine. Rest 60 seconds.",
    parts: {
      arms: "The swinging arms that travel in an arc. Their start position adjusts — set it for a stretch, not a strain.",
      handles: "Upright grips (elbow pads on some models). Hold them lightly with slightly bent elbows.",
      seat: "Height-adjustable: set it so the handles line up with the middle of your chest.",
      "weight-stack": "The plates that set the load. Choose the weight with the selector pin.",
    },
  },

  "seated-cable-row": {
    summary: "A low cable row done sitting down, for a thicker, stronger back.",
    description:
      "The seated cable row pulls a handle towards your belly against a weight stack, training the mid-back, lats and rear shoulders with steady tension. Your feet brace on a footplate so your legs stay still and your back does the work. Swapping the V-handle for a wide bar shifts the emphasis to the upper back.",
    howToUse: {
      setup: [
        "Clip the V-handle (or the attachment you want) onto the cable.",
        "Select a light weight with the pin.",
        "Sit on the bench with your feet on the footplate and knees slightly bent.",
        "Lean forward to take the handle, then sit tall with arms straight so the plates lift off the stack.",
      ],
      use: [
        "Sit tall, chest up and shoulders down.",
        "Pull the handle to your lower ribs by driving your elbows back close to your body.",
        "Squeeze your shoulder blades together for a moment.",
        "Let your arms extend slowly until straight, feeling a stretch across your back.",
        "Keep your torso almost still — a small lean is fine, a big rock isn't.",
      ],
    },
    safety: [
      "Keep your lower back neutral: don't round forward to reach or yank back with your spine.",
      "Keep a slight bend in the knees; locked knees pull on your lower back.",
      "Lean forward to set the handle down at the end — never let go with the stack raised.",
    ],
    commonMistakes: [
      "Rocking the whole torso back and forth",
      "Shrugging and pulling towards the neck",
      "Letting the stack crash between reps",
      "Rounding the back at the stretch",
      "Pulling with the arms only",
    ],
    musclesTrained: ["upper-back", "lats", "rear-delts", "biceps", "traps", "forearms", "lower-back"],
    specs: [
      { label: "Weight stack", value: "Typically 90–120 kg / 200–260 lb" },
      { label: "Attachments", value: "V-handle, wide bar or single handles" },
      { label: "Plate steps", value: "Usually 5 kg / 10 lb" },
    ],
    beginnerTip: "Start each rep by pulling your shoulder blades back, then bend your arms. \"Back first, arms second\" is what makes your back do the work.",
    starterWorkout: "Back builder: 4 × 10 seated cable rows with a 1-second squeeze, then 2 × 12 with a wide bar. Rest 90 seconds.",
    parts: {
      handle: "The close-grip V-handle, palms facing in. Clip on a straight bar instead to work the upper back more.",
      footplate: "Brace your feet here with knees slightly bent. It anchors you so your legs stay out of the pull.",
      seat: "A long, low bench. Sit tall with your hips far enough back that your arms are straight at the start.",
      "weight-stack": "The plates the cable lifts. Pick the weight with the pin and keep them off the stack between reps.",
    },
  },

  "chest-press-machine": {
    summary: "A seated press that trains the chest like a bench press, with no spotter needed.",
    description:
      "The chest press guides the handles along a fixed path, so you can push hard without balancing a bar or worrying about getting stuck under it. It's a great way to learn pressing and to train safely close to failure. Many machines have converging arms that come slightly together as you press, matching the chest's natural movement.",
    howToUse: {
      setup: [
        "Adjust the seat so the handles line up with the middle of your chest.",
        "If the back pad adjusts, set it so your elbows start just behind your body with a comfortable stretch.",
        "Select the weight with the pin.",
        "Sit with your back flat against the pad and feet flat on the floor.",
      ],
      use: [
        "Grip the handles with straight wrists, elbows about 45° from your body.",
        "Press forward until your arms are straight but not locked.",
        "Return slowly until you feel a stretch across your chest, without letting the plates touch.",
        "Keep your shoulder blades back against the pad throughout.",
      ],
    },
    safety: [
      "Set the seat height first — handles too high strain the shoulders.",
      "Don't snap your elbows into lockout.",
      "Keep your head and back on the pad; don't lean forward to finish a rep.",
    ],
    commonMistakes: [
      "Seat so low the handles sit at shoulder height",
      "Flaring the elbows straight out to the sides",
      "Shoulders rolling forward at the end of the press",
      "Bouncing the weight stack",
    ],
    musclesTrained: ["chest", "triceps", "front-delts"],
    specs: [
      { label: "Weight stack", value: "Typically 90–140 kg / 200–300 lb" },
      { label: "Adjustments", value: "Seat height, back pad depth" },
      { label: "Grips", value: "Horizontal and vertical handles" },
    ],
    beginnerTip: "If the horizontal handles bother your shoulders, use the vertical (palms-in) ones — they keep your elbows tucked naturally.",
    starterWorkout: "Push starter: 3 × 10 chest presses, then 2 × 15 with a lighter weight and a 2-second squeeze. Rest 90 seconds.",
    parts: {
      handles: "The grips you press. Most machines offer horizontal and vertical handles — pick whichever keeps wrists and shoulders comfortable.",
      backrest: "Supports your back and shoulder blades. On some machines it slides to set how deep the stretch is.",
      seat: "Adjust the height so the handles line up with the middle of your chest.",
      "weight-stack": "The plates that provide the load. Choose the weight with the selector pin.",
    },
  },

  "shoulder-press-machine": {
    summary: "A seated overhead press on a guided path — strong shoulders without balancing a bar.",
    description:
      "The shoulder press machine lets you press overhead with your back supported and the handles on a fixed path, a safe way to build the front and side delts and the triceps. Because you don't have to stabilise a bar, it suits beginners and is great for pushing hard late in a workout.",
    howToUse: {
      setup: [
        "Adjust the seat so the handles start at about shoulder height.",
        "Select a light weight with the pin.",
        "Sit with your back against the pad and feet flat on the floor.",
        "Take the handles with a grip slightly wider than your shoulders.",
      ],
      use: [
        "Press the handles up until your arms are straight but not locked.",
        "Lower slowly back to shoulder height.",
        "Keep your ribs down and your back against the pad — don't arch.",
        "Breathe out as you press and in as you lower.",
      ],
    },
    safety: [
      "Set the seat so the handles start at shoulder level — too low forces the shoulders into an extreme stretch.",
      "Don't arch your lower back to push more weight.",
      "Stop if you feel a pinch at the front of the shoulder.",
    ],
    commonMistakes: [
      "Arching the lower back off the pad",
      "Seat set too low",
      "Shrugging the shoulders up to the ears",
      "Half reps with too much weight",
    ],
    musclesTrained: ["front-delts", "side-delts", "triceps", "traps"],
    specs: [
      { label: "Weight stack", value: "Typically 70–110 kg / 150–240 lb" },
      { label: "Adjustments", value: "Seat height" },
      { label: "Grips", value: "Wide overhand and palms-in handles" },
    ],
    beginnerTip: "Keep your elbows slightly in front of your body rather than flared straight out — easier on the shoulders and just as effective.",
    starterWorkout: "Shoulder starter: 3 × 10 machine shoulder presses, then 2 × 15 dumbbell lateral raises. Rest 90 seconds.",
    parts: {
      handles: "The grips you press overhead. Wide handles target the delts; palms-in handles are kinder to stiff shoulders.",
      backrest: "Keeps you upright and supported. Keep your ribs and lower back pressed into it.",
      seat: "Set the height so the handles start at shoulder level.",
      "weight-stack": "The plates that provide the load. Choose the weight with the selector pin.",
    },
  },

  "seated-leg-curl": {
    summary: "Bend your knees against a padded lever to isolate the hamstrings.",
    description:
      "The seated leg curl trains the hamstrings by bending the knees while your hips are bent — a position that stretches the hamstrings and makes them work hard. A thigh pad locks your legs down and an ankle pad sits behind your lower calves. It pairs perfectly with the leg extension for balanced, healthy knees.",
    howToUse: {
      setup: [
        "Adjust the backrest so your knees line up with the machine's pivot.",
        "Set the ankle pad so it rests on the back of your lower calves, just above the heels.",
        "Lower the thigh pad until it presses firmly on your thighs just above the knees.",
        "Select a light weight and hold the side handles.",
      ],
      use: [
        "Sit tall with your back against the pad.",
        "Curl your heels down and back under the seat as far as you can.",
        "Squeeze your hamstrings for a moment at the bottom.",
        "Let your legs straighten slowly over 2–3 seconds, stopping before the plates touch.",
      ],
    },
    safety: [
      "Line your knees up with the pivot so the joint isn't strained.",
      "Keep the thigh pad snug so your hips don't lift.",
      "Use smooth reps — hamstrings strain and cramp when you jerk the weight.",
    ],
    commonMistakes: [
      "Knees not lined up with the pivot",
      "Thigh pad too loose, so the hips rise",
      "Ankle pad too high up the calf",
      "Rushing the return",
    ],
    musclesTrained: ["hamstrings", "calves"],
    specs: [
      { label: "Weight stack", value: "Typically 70–100 kg / 150–220 lb" },
      { label: "Adjustments", value: "Backrest, thigh pad, ankle pad, range of motion" },
    ],
    beginnerTip: "Pull your toes up towards your shins while you curl — it keeps the effort on the hamstrings rather than the calves.",
    starterWorkout: "Hamstring focus: 3 × 12 seated leg curls with a 1-second squeeze and a slow 3-second return. Rest 60 seconds.",
    parts: {
      "thigh-pad": "Clamps down on your thighs just above the knees so your hips stay put while you curl.",
      "ankle-pad": "The roller behind your lower calves that you push down and back. Set it just above your heels.",
      pivot: "The machine's hinge. Line it up with your knee joint so the lever moves with your leg.",
      "weight-stack": "The plates that set the load. Choose the weight with the selector pin.",
    },
  },

  "hack-squat": {
    summary: "A plate-loaded squat on an angled sled, for heavy quad work with your back supported.",
    description:
      "On a hack squat you stand on an angled platform with pads on your shoulders and your back against a sled that slides on rails. The machine holds you in an upright squat, so you can train your quads very hard without balancing a barbell. Foot position shifts the focus: lower and closer works the quads more, higher and wider brings in the glutes.",
    howToUse: {
      setup: [
        "Load plates evenly on the horns — the sled adds weight of its own.",
        "Step onto the platform with your back against the pad and shoulders under the shoulder pads.",
        "Place your feet shoulder-width apart in the middle of the platform.",
        "Straighten your legs slightly and turn the safety handles out to release the sled.",
      ],
      use: [
        "Brace and bend your knees to lower the sled under control, knees tracking over your toes.",
        "Go as deep as you can while your back and hips stay flat on the pad.",
        "Drive through your whole foot to stand back up, stopping just short of locking out.",
        "After the last rep, stand up fully and turn the safety handles back in.",
      ],
    },
    safety: [
      "Always re-engage the safety catches before stepping out.",
      "Keep your heels down and your back flat against the pad.",
      "Don't lock your knees hard at the top.",
      "Set any adjustable stops just below your deepest point.",
    ],
    commonMistakes: [
      "Heels lifting at the bottom",
      "Knees caving inwards",
      "Half reps with too much weight",
      "Lower back peeling off the pad",
      "Bouncing out of the bottom",
    ],
    musclesTrained: ["quads", "glutes", "adductors", "hamstrings", "calves"],
    specs: [
      { label: "Sled angle", value: "Typically 45°" },
      { label: "Sled weight", value: "Often 30–50 kg / 65–110 lb — check the label" },
      { label: "Loading", value: "Plate horns for Olympic plates" },
    ],
    beginnerTip: "Start with just the sled and slow, deep reps. Hack squat numbers aren't comparable with your barbell squat — it feels much heavier.",
    starterWorkout: "Quad day: 4 × 8–10 hack squats with a 3-second descent, then 2 × 15 leg extensions. Rest 2 minutes.",
    parts: {
      "shoulder-pads": "Padded yokes that sit on top of your shoulders and carry the load down through your body.",
      platform: "The angled foot plate. Feet low works more quads; feet high and wide works more glutes.",
      sled: "The carriage with the back pad that slides on rails, keeping your torso supported and on a fixed path.",
      safety: "Handles beside the shoulder pads that lock the sled. Turn them out to start and back in to finish.",
    },
  },

  "hip-abduction": {
    summary: "A seated machine that pushes your knees apart (abduction) or squeezes them together (adduction).",
    description:
      "This two-way machine trains the muscles on the outside of your hips (glute medius and minimus) and your inner-thigh adductors. Strong abductors help your knees track well in squats and lunges; strong adductors help with squat depth and stability. Flip or move the thigh pads to switch between opening and closing your legs against resistance.",
    howToUse: {
      setup: [
        "Choose the mode: pads on the outside of your knees for abduction, on the inside for adduction.",
        "Use the range lever to set the start width — a comfortable stretch, not a strain.",
        "Select a light weight with the pin.",
        "Sit with your back against the pad and feet on the footrests.",
      ],
      use: [
        "Abduction: push your knees outwards against the pads as far as is comfortable.",
        "Adduction: squeeze your knees together until the pads almost touch.",
        "Pause for a second at the end of each rep.",
        "Return slowly without letting the plates touch.",
      ],
    },
    safety: [
      "Start with a small range and light weight — inner thighs strain easily when overstretched.",
      "Keep your back against the pad and hips on the seat.",
      "Move slowly; don't let the pads snap back.",
    ],
    commonMistakes: [
      "Start width set too wide on adduction",
      "Rocking the torso to move the weight",
      "Letting the pads snap back",
      "Too much weight for a full range",
    ],
    musclesTrained: ["glutes", "adductors"],
    specs: [
      { label: "Weight stack", value: "Typically 70–100 kg / 150–220 lb" },
      { label: "Modes", value: "Abduction (outer hip) and adduction (inner thigh)" },
      { label: "Adjustments", value: "Start-width lever, pad position" },
    ],
    beginnerTip: "Lean slightly forward during abduction to feel more of your glutes — a small change in torso angle makes a big difference.",
    starterWorkout: "Hip stability: 2 × 15 abduction and 2 × 15 adduction, slow and controlled with a 1-second squeeze. Rest 45 seconds.",
    parts: {
      "thigh-pads": "Pads that press on the sides of your knees. Move them between the outer and inner positions to change the exercise.",
      "range-lever": "Sets how wide the pads start. Begin with a small range and open it up as you get more flexible.",
      seat: "Sit upright with your back against the pad and your feet on the footrests.",
      "weight-stack": "The plates that set the resistance. Choose the weight with the selector pin.",
    },
  },

  "seated-calf-raise": {
    summary: "A seated, plate-loaded calf raise that targets the soleus, the deep calf muscle.",
    description:
      "With your knees bent at about 90°, the seated calf raise shifts the work onto the soleus — the deep calf muscle beneath the gastrocnemius that does much of the work in walking and running. The knee pad rests on your thighs, the balls of your feet sit on the toe plate, and you raise the weight by rising onto your toes.",
    howToUse: {
      setup: [
        "Load plates on the plate horn — start light.",
        "Sit down and place the balls of your feet on the toe plate, heels hanging off.",
        "Adjust the knee pad so it rests snugly on your lower thighs.",
        "Push up onto your toes slightly and move the release lever to unlock the weight.",
      ],
      use: [
        "Lower your heels slowly as far as is comfortable to stretch the calves.",
        "Pause for a second in the stretch.",
        "Push through the balls of your feet to rise as high as you can.",
        "Squeeze at the top, then lower slowly.",
        "After the last rep, rise up and push the release lever back to lock the weight.",
      ],
    },
    safety: [
      "Always re-lock the release lever before taking your feet off the plate.",
      "Keep the balls of your feet firmly on the plate so they can't slip.",
      "Stretch gently at the bottom; don't bounce.",
    ],
    commonMistakes: [
      "Bouncing out of the bottom",
      "Short range with too much weight",
      "Feet slipping until only the toes are on the plate",
      "Rushing the reps",
    ],
    musclesTrained: ["calves"],
    specs: [
      { label: "Loading", value: "Plate horn for Olympic plates" },
      { label: "Knee angle", value: "About 90°" },
      { label: "Adjustments", value: "Knee pad height" },
    ],
    beginnerTip: "Calves respond to a full stretch and a pause. Count one second low and one second high on every rep.",
    starterWorkout: "Calf builder: 3 × 15 seated calf raises with a 1-second pause at the bottom and top. Rest 45 seconds.",
    parts: {
      "knee-pad": "The padded bar over your lower thighs that carries the load. Adjust it to sit snugly with your feet on the plate.",
      footplate: "The toe plate for the balls of your feet, with your heels hanging off so you can stretch down.",
      release: "The lever that locks and unlocks the weight arm. Unlock to start, and lock it again before you get off.",
      "plate-horn": "The peg where you load weight plates.",
    },
  },

  "assisted-pull-up": {
    summary: "A machine that takes some of your bodyweight off pull-ups and dips while you build up to them.",
    description:
      "You kneel on a pad linked to a counterweight, and the weight you select is taken off your bodyweight — so more weight means more help. It lets you do full-range pull-ups, chin-ups and dips with good form, then reduce the help over time until you can do them unaided.",
    howToUse: {
      setup: [
        "Select the assistance: more weight = more help. Start with about half your bodyweight.",
        "Climb the steps and take the pull-up grips (or the dip handles for dips).",
        "Place one knee, then the other, carefully on the knee pad.",
        "Let the pad rise until your arms are straight.",
      ],
      use: [
        "Pull-up: drive your elbows down and pull your chest towards the bar until your chin clears it.",
        "Lower slowly until your arms are fully straight.",
        "Dip: hold the dip handles, press to straight arms, then lower until your upper arms are about parallel to the floor.",
        "To finish, step one foot back onto the step at the top position, then the other, before letting go.",
      ],
    },
    safety: [
      "Always get off at the top of the movement, one foot at a time — stepping off at the bottom can make the pad shoot up.",
      "Keep your knees in the middle of the pad.",
      "Control the lowering; don't let the pad drag you down.",
    ],
    commonMistakes: [
      "Too little assistance, leading to half reps",
      "Swinging or kicking",
      "Not lowering to straight arms",
      "Getting off at the bottom of the movement",
    ],
    musclesTrained: ["lats", "biceps", "upper-back", "chest", "triceps", "front-delts", "forearms"],
    specs: [
      { label: "Assist stack", value: "Typically up to 70–100 kg / 150–220 lb of help" },
      { label: "Grips", value: "Wide, narrow and palms-in pull-up grips, plus dip handles" },
      { label: "Platform", value: "Kneeling pad (standing platform on some models)" },
    ],
    beginnerTip: "It works backwards: more weight on the stack makes it easier. Track progress by lowering the assistance a little each week.",
    starterWorkout: "Pull and push: 3 × 6–8 assisted pull-ups and 3 × 8 assisted dips, with enough help for every rep to be full range. Rest 90 seconds.",
    parts: {
      "knee-pad": "The platform you kneel on. It's linked to the counterweight and pushes you up to lighten the load.",
      grips: "Pull-up handles at the top in wide, narrow and palms-in positions for pull-ups and chin-ups.",
      "dip-handles": "Parallel handles at waist height for assisted dips.",
      "weight-stack": "The counterweight. Unlike other machines, more weight on the pin gives you more help.",
    },
  },

  // ────────────────────────────── CARDIO ──────────────────────────────
  elliptical: {
    summary: "A smooth, low-impact cardio machine that works arms and legs together.",
    description:
      "The elliptical (cross trainer) moves your feet in an oval without them ever leaving the pedals, so there's no impact — ideal for joint-friendly cardio. Moving handles let your arms push and pull for a full-body workout, and pedalling backwards shifts more work to the hamstrings and glutes. Resistance, and on many machines the ramp or stride length, can be adjusted.",
    howToUse: {
      setup: [
        "Hold the fixed handrails and step onto the pedals while they're still, starting with the lower pedal.",
        "Place your feet flat in the middle of the pedals, heels down.",
        "Start pedalling to wake the console, then choose Quick Start or a program.",
        "Set a low resistance for the first few minutes.",
      ],
      use: [
        "Stand tall with your weight centred over your feet and a soft bend in your knees.",
        "Push and pull the moving handles in rhythm with your legs.",
        "Make it harder with resistance or incline rather than just going faster.",
        "Try short spells of pedalling backwards to work the hamstrings and glutes.",
        "Slow down for a 3–5 minute cool-down before stepping off.",
      ],
    },
    safety: [
      "Step on and off only when the pedals have stopped.",
      "Hold the fixed handrails if you feel unsteady.",
      "Keep your feet flat on the pedals to avoid numb toes and ankle strain.",
    ],
    commonMistakes: [
      "Leaning heavily on the handles",
      "Pedalling on tiptoes",
      "Spinning very fast with no resistance",
      "Hunching over the console",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "calves", "chest", "lats", "triceps"],
    specs: [
      { label: "Stride length", value: "About 45–55 cm / 18–22 in" },
      { label: "Resistance", value: "Typically 15–25 levels" },
      { label: "Incline", value: "Adjustable ramp on many models" },
    ],
    beginnerTip: "Push the handles as well as pedalling — using your arms spreads the effort, so the same workout feels easier.",
    starterWorkout: "Low-impact intervals: 5 min easy, then 6 × (1 min hard at higher resistance, 1 min easy), then 5 min easy.",
    parts: {
      pedals: "Large footplates that travel in an oval. Keep your feet flat and centred, heels down.",
      handles: "Moving arms linked to the pedals. Push and pull them to work your upper body too.",
      console: "Shows time, distance, resistance and heart rate, and holds the workout programs.",
      flywheel: "The weighted wheel inside that keeps the motion smooth; the resistance level acts on it.",
    },
  },

  "stair-climber": {
    summary: "A revolving staircase for tough, low-impact cardio that builds glutes and legs.",
    description:
      "A stair climber (stepmill) turns a set of steps like an escalator, so you keep climbing at the speed you choose. It's one of the hardest cardio machines minute for minute, building leg and glute endurance with far less impact than running. Even a slow pace gets your heart rate up quickly.",
    howToUse: {
      setup: [
        "Hold the handrails and step onto the bottom step while the machine is stopped.",
        "Clip on the safety key if there is one, and note where the stop button is.",
        "Press Start and choose a slow level to begin.",
        "Stand tall with your whole foot on the step.",
      ],
      use: [
        "Climb with your whole foot on each step, pushing through your heel.",
        "Stay upright and rest your hands lightly on the rails for balance only.",
        "Raise the speed a level at a time once you've warmed up.",
        "For short spells, take every other step to work the glutes harder.",
        "Slow to an easy pace to cool down, press Stop and wait for the steps to halt before stepping off.",
      ],
    },
    safety: [
      "Hold the rails when getting on and off, and only when the steps are stopped.",
      "Look ahead rather than down at your feet.",
      "Use the stop button straight away if you lose your rhythm.",
    ],
    commonMistakes: [
      "Leaning on the handrails and taking weight off your legs",
      "Climbing on tiptoes",
      "Hunching over the console",
      "Starting too fast",
    ],
    musclesTrained: ["glutes", "quads", "hamstrings", "calves"],
    specs: [
      { label: "Speed", value: "About 25–160 steps per minute" },
      { label: "Step height", value: "About 20 cm / 8 in" },
      { label: "Levels", value: "Typically 1–20" },
    ],
    beginnerTip: "Go slower than you think: 10 minutes at a steady low level is a great first session. Letting go of the rails makes it harder — and more effective.",
    starterWorkout: "Stair starter: 3 min easy, then 5 × (1 min moderate, 1 min easy), then 3 min easy.",
    parts: {
      steps: "The revolving staircase. Place your whole foot on each step and climb at the machine's pace.",
      handrails: "For balance and for getting on and off. Rest your hands lightly — leaning takes the work away from your legs.",
      console: "Sets the speed or level and shows time, floors, steps and calories. It has the Stop button.",
    },
  },

  "air-bike": {
    summary: "A fan bike whose resistance rises the harder you go — the king of brutal intervals.",
    description:
      "An air bike links pedals and moving handles to a large fan. The faster you push and pull, the more air resistance the fan makes, so the bike matches whatever effort you give it. That makes it perfect for short, all-out intervals and full-body conditioning, with very little impact on the joints.",
    howToUse: {
      setup: [
        "Set the seat height so your knee is slightly bent with a pedal at the bottom.",
        "Slide the seat forward or back so you reach the handles with slightly bent arms.",
        "Put your feet on the pedals and take the handles.",
        "Start pedalling to wake the console, then pick an interval program or just go.",
      ],
      use: [
        "Push and pull the handles in time with your legs.",
        "Keep your core tight and your hips on the seat.",
        "For intervals, go hard for a short spell (10–20 seconds), then pedal easily to recover.",
        "Watch watts, RPM or calories to keep each effort consistent.",
        "Ease off gradually at the end — the fan takes a while to spin down.",
      ],
    },
    safety: [
      "Keep fingers and loose clothing away from the fan guard.",
      "The handles keep moving while the pedals turn — don't let go at speed.",
      "Build up to all-out sprints; they're very demanding on the heart and lungs.",
    ],
    commonMistakes: [
      "Seat set too low",
      "Using only the legs or only the arms",
      "Sprinting flat out at the start of a long effort",
      "Bouncing on the seat",
    ],
    musclesTrained: ["quads", "glutes", "hamstrings", "calves", "chest", "lats", "triceps", "biceps", "front-delts"],
    specs: [
      { label: "Resistance", value: "Unlimited — set by how hard you pedal" },
      { label: "Fan", value: "About 65–70 cm / 26–27 in across" },
      { label: "Console", value: "Watts, RPM, calories, distance, intervals" },
    ],
    beginnerTip: "Start with 10 seconds hard and 50 seconds easy. The air bike punishes pacing mistakes — you can always go harder next round.",
    starterWorkout: "Air bike intervals: 3 min easy, then 8 × (10 s hard, 50 s easy), then 3 min easy.",
    parts: {
      fan: "The large fan inside the guard. The faster it spins, the more air it moves and the harder the bike gets.",
      handles: "Arms linked to the pedals. Push and pull them to bring your upper body into the work.",
      pedals: "Wide pedals, usually with toe cages. Push through the ball of your foot.",
      seat: "Adjusts up and down and forward and back. Set it like a normal bike: knee slightly bent at the bottom.",
    },
  },

  // ──────────────────────────── ACCESSORIES ───────────────────────────
  "resistance-bands": {
    summary: "Elastic bands for warm-ups, assistance and adding resistance anywhere.",
    description:
      "Resistance bands get harder the further you stretch them, which makes them great for warm-ups, shoulder health, glute activation and adding tension to squats and push-ups. Flat loop bands are colour-coded by strength, and long \"power\" bands can assist pull-ups. Tube bands with handles work like a portable cable machine when fixed to a door anchor or a sturdy post.",
    howToUse: {
      setup: [
        "Pick a band by colour: lighter for small muscles (shoulders, glutes), heavier for big moves.",
        "Check for nicks, tears or sticky patches before use — damaged bands can snap.",
        "For tube bands, clip on the handles and fix the band to a door anchor or post at the height you need.",
        "Step far enough from the anchor that there's some tension at the start.",
      ],
      use: [
        "Move slowly against the band — the resistance peaks as it stretches.",
        "Control the return; don't let the band snap you back.",
        "For glute work, put a mini-loop above your knees and push your knees out during squats and bridges.",
        "For assisted pull-ups, loop a long band over the bar and put a foot or knee in it.",
        "Make it harder by stepping further from the anchor or choosing a stronger band.",
      ],
    },
    safety: [
      "Inspect bands every time and replace any that are cracked or worn.",
      "Anchor only to solid fixtures; shut door anchors on the hinge side of a closed door.",
      "Keep the stretched band away from your face.",
      "Don't stretch a band more than about three times its resting length.",
    ],
    commonMistakes: [
      "Letting the band snap back",
      "Choosing a band too strong to use with good form",
      "Anchoring to something that moves",
      "Keeping a damaged band in use",
    ],
    musclesTrained: ["glutes", "side-delts", "rear-delts", "upper-back", "chest", "biceps", "triceps", "quads"],
    specs: [
      { label: "Colours", value: "Light to heavy, e.g. yellow → red → green → blue → black (varies by brand)" },
      { label: "Loop sizes", value: "About 30 cm mini-loops and 1 m power bands" },
      { label: "Resistance", value: "Roughly 2–70 kg depending on the band" },
    ],
    beginnerTip: "Use a light mini-band for a 5-minute glute and shoulder warm-up before every session — it wakes up the muscles that keep your hips and shoulders stable.",
    starterWorkout: "Band warm-up: 2 rounds of 15 band pull-aparts, 12 banded glute bridges, 12 lateral band walks each way and 10 band face pulls.",
    parts: {
      loop: "A continuous flat band. Mini-loops go around your legs for glute work; long power bands assist pull-ups or add tension to lifts.",
      tube: "A rubber tube with clips at each end. Clip on handles and anchor it to use it like a cable machine.",
      handles: "Padded grips that clip onto tube bands for presses, rows and curls.",
      anchor: "A strap with a padded stopper that you shut in a door (hinge side) to fix the band at any height.",
    },
  },

  "ab-wheel": {
    summary: "A small wheel with handles for rollouts — one of the toughest core exercises there is.",
    description:
      "The ab wheel rollout trains your core to stop your lower back arching as you roll out and pull back, like a moving plank. It works the abs very hard and also the lats and shoulders. Start from your knees with a short range and roll further as you get stronger.",
    howToUse: {
      setup: [
        "Put a mat down for your knees.",
        "Kneel on the mat with the wheel on the floor just in front of your knees.",
        "Grip both handles with straight arms, shoulders over the wheel.",
        "Tuck your pelvis slightly and brace your abs as if for a punch.",
      ],
      use: [
        "Roll the wheel forward slowly, hips moving with your shoulders and back flat.",
        "Go only as far as you can without your lower back sagging.",
        "Pull the wheel back towards your knees using your abs and lats.",
        "Keep your arms straight throughout.",
        "Add range a little at a time over the weeks.",
      ],
    },
    safety: [
      "End the rep before your lower back arches — that's the point your abs have let go.",
      "Use a mat under your knees.",
      "Roll towards a wall at first so it stops you going too far.",
    ],
    commonMistakes: [
      "Hips sagging and the back arching",
      "Going too far too soon",
      "Bending the arms",
      "Pushing the hips back first instead of moving as one unit",
    ],
    musclesTrained: ["abs", "obliques", "lats", "front-delts", "triceps", "lower-back"],
    specs: [
      { label: "Wheel", value: "Single or double, about 15–20 cm / 6–8 in across" },
      { label: "Handles", value: "Foam or rubber grips through the axle" },
    ],
    beginnerTip: "Kneel facing a wall a short distance away and roll out until the wheel touches it. Move a few centimetres further back as you get stronger.",
    starterWorkout: "Core finisher: 3 × 6–10 kneeling rollouts (to a wall if needed), then 3 × 30 s forearm plank. Rest 60 seconds.",
    parts: {
      wheel: "The rolling wheel (sometimes two side by side for extra stability). It should roll smoothly and straight.",
      handles: "Grips on either side of the wheel. Hold them with straight arms, shoulders over the wheel.",
    },
  },

  "battle-ropes": {
    summary: "Heavy ropes you whip into waves for intense, low-impact conditioning.",
    description:
      "Battle ropes are thick, heavy ropes looped around an anchor. Making waves, slams and circles with them works your shoulders, arms, core and grip while driving your heart rate up — without the pounding of running. Thicker and longer ropes are heavier and harder.",
    howToUse: {
      setup: [
        "Check the rope is looped around a secure anchor with both ends the same length.",
        "Take one end in each hand with a firm grip.",
        "Walk back until there's a little slack in the rope.",
        "Stand athletically: feet shoulder-width, knees bent, hips back, chest up.",
      ],
      use: [
        "Alternating waves: move your arms up and down quickly, one at a time, sending waves to the anchor.",
        "Double waves: move both arms together.",
        "Slams: lift both ropes overhead and slam them down hard.",
        "Drive the movement from your shoulders and core, not just your wrists.",
        "Work in short intervals — 15–30 seconds on, then rest.",
      ],
    },
    safety: [
      "Keep your back flat and knees soft; don't round over the ropes.",
      "Make sure nobody is near the rope's path.",
      "Stop when your grip or form fades — sloppy reps strain the shoulders and lower back.",
    ],
    commonMistakes: [
      "Standing tall with straight legs",
      "Too much or too little slack",
      "Moving only the wrists",
      "Going too long at the start",
    ],
    musclesTrained: ["front-delts", "side-delts", "forearms", "abs", "obliques", "biceps", "triceps", "upper-back", "quads"],
    specs: [
      { label: "Length", value: "Usually 9–15 m / 30–50 ft" },
      { label: "Thickness", value: "38 mm / 1.5 in or 50 mm / 2 in" },
      { label: "Weight", value: "About 7–20 kg / 15–45 lb" },
    ],
    beginnerTip: "Think fast and small, not big and slow: quick waves that reach the anchor beat giant arm swings.",
    starterWorkout: "Rope intervals: 6 rounds of 20 s alternating waves and 40 s rest, then 4 rounds of 15 s slams and 45 s rest.",
    parts: {
      rope: "The heavy rope itself, doubled around the anchor so you hold one end in each hand.",
      anchor: "The fixed point the rope loops around — a wall mount, post or heavy kettlebell. It must not move.",
      grips: "The taped or rubber-capped ends you hold. Grip them firmly, thumbs on top.",
    },
  },

  "foam-roller": {
    summary: "A firm foam cylinder for self-massage before and after training.",
    description:
      "Foam rolling uses your bodyweight to press on muscles, which can ease feelings of stiffness and briefly improve how freely you move. A few minutes on your quads, glutes, calves and upper back makes a good part of a warm-up or cool-down. Smooth rollers are gentler; textured and high-density rollers dig in more.",
    howToUse: {
      setup: [
        "Take a roller and a mat to a clear bit of floor.",
        "Start with a smooth, softer roller if you're new to it.",
        "Sit or lie so the roller is under the muscle you want to work, not under a joint or bone.",
        "Use your hands and feet to control how much weight goes onto the roller.",
      ],
      use: [
        "Roll slowly back and forth over the muscle, a few centimetres per second.",
        "When you find a tender spot, pause and breathe for 10–20 seconds.",
        "Spend about 30–60 seconds on each area.",
        "For the upper back, support your head with your hands and roll between the shoulder blades.",
        "Wipe the roller down and put it back when you're done.",
      ],
    },
    safety: [
      "Don't roll directly over joints, bones or your lower back — work the muscles around them.",
      "It should feel like firm pressure, not sharp pain.",
      "Skip areas with bruises, injuries or swelling.",
    ],
    commonMistakes: ["Rolling too fast", "Rolling the lower back", "Pressing into painful spots for minutes", "Holding your breath"],
    musclesTrained: ["quads", "hamstrings", "glutes", "calves", "upper-back", "lats", "adductors"],
    specs: [
      { label: "Length", value: "About 30–90 cm / 12–36 in" },
      { label: "Diameter", value: "About 15 cm / 6 in" },
      { label: "Density", value: "Soft, medium or firm (often textured)" },
    ],
    beginnerTip: "Slow down: slow rolls with steady breathing help the muscle relax; fast rolling just rubs the skin.",
    starterWorkout: "5-minute roll-out: 45 seconds each on calves, hamstrings, quads, glutes, upper back and lats, with a pause on tight spots.",
    parts: {
      surface: "The outer foam. Smooth surfaces give gentle, even pressure; ridged or knobbly ones dig in for a deeper massage.",
      core: "The rigid hollow tube inside that stops the roller flattening, even under your full bodyweight.",
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
