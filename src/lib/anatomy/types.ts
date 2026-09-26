/**
 * Pose authoring model.
 *
 * Poses are written in a side-view "authoring space" measured in centimetres:
 *   x → the direction the athlete faces (forward)
 *   y → down (the floor is at y = 250)
 *   z → outward from the body's midline (always a positive distance;
 *       the solver mirrors it for the left/right side)
 *
 * Side 0 is the limb nearest the default camera. Asymmetric movements
 * (single-arm rows, lunges) use index 0 for the working/front limb.
 */

export const FLOOR_Y = 250;

export type Vec3 = [number, number, number];

export type TargetRef = "world" | "root" | "chest" | "pelvis";

export interface Target {
  x: number;
  y: number;
  /**
   * Outward distance. For "world"/"chest"/"pelvis" targets it is the absolute
   * distance from the midline (defaults to the limb root's). For "root"
   * targets it is an offset added to the root joint (defaults to 0).
   */
  z?: number;
  rel?: TargetRef;
  /**
   * Interpret x/y in the torso frame instead of the world frame:
   * x along the chest normal, y down the spine.
   */
  local?: boolean;
}

export interface IkLimb {
  /** Where the wrist (arms) or ankle (legs) should be. */
  ik: Target;
  /** Direction the elbow/knee should point: [x, y, outward z]. */
  pole: Vec3;
  /** Foot tilt in degrees, positive = toes down (legs only). */
  foot?: number;
  /** Wrist flexion in degrees (arms only): positive bends the hand towards the palm, negative extends it. Default 0. */
  wrist?: number;
}

export interface AngleLimb {
  /**
   * Absolute side-view angles for [upper, lower] segment, in degrees.
   * 0 points straight down, 90 points forward, 180 / -180 point up.
   */
  angles: [number, number];
  /** Degrees each segment swings outward, away from the midline. */
  spread?: [number, number];
  foot?: number;
  /** Foot follows the shin (pointed toes) instead of staying flat. */
  footFollowsShin?: boolean;
  /** Wrist flexion in degrees (arms only): positive bends the hand towards the palm, negative extends it. Default 0. */
  wrist?: number;
}

export type LimbSpec = IkLimb | AngleLimb;

export interface Pose {
  /** Pelvis centre. */
  hip: [number, number];
  /** Torso lean in degrees: 0 upright, 90 face-down horizontal, -90 face-up. */
  torso: number;
  /** Extra head pitch in degrees (positive = chin down). */
  head?: number;
  /** Rotation of the shoulders around the spine, degrees (single-arm moves). */
  twist?: number;
  /** Shoulder elevation in cm along the spine (shrugs); the collarbones tilt with it. */
  shrug?: number;
  /**
   * Whole-body orientation in degrees, applied after solving as a rigid
   * rotation of every joint and frame vector about the pelvis centre: first
   * `roll` about the world x axis (positive brings the near side, +z, down
   * toward the floor), then `yaw` about the vertical axis (positive turns the
   * facing direction from +x toward +z). Omitted = no rotation.
   */
  orient?: { roll?: number; yaw?: number };
  /**
   * Grip style for this keyframe, overriding the held prop's style: one style for
   * both hands or [side 0, side 1]. The Timeline turns the forearm smoothly between
   * keyframes with different styles (e.g. a Zottman curl). Omitted = the prop's style.
   * Set it on every keyframe of an animation that uses it.
   */
  grip?: GripStyle | [GripStyle, GripStyle];
  /**
   * Palm turn per arm in degrees (5 = underhand, 90 = neutral, 175 = overhand), derived
   * from `grip` by the Timeline so it interpolates; set directly only for in-between turns.
   */
  gripTurn?: [number, number];
  arms: [LimbSpec] | [LimbSpec, LimbSpec];
  legs: [LimbSpec] | [LimbSpec, LimbSpec];
}

export interface Keyframe {
  pose: Pose;
  /** Seconds to move from this keyframe to the next. */
  dur?: number;
  /** Seconds to pause on this keyframe before moving on. */
  hold?: number;
  /** Cue shown while moving away from this keyframe, e.g. "Lower slowly". */
  cue?: string;
  /** Marks the keyframe that completes a repetition. */
  rep?: boolean;
  /**
   * Blend from this keyframe to the next: "smooth" (default) eases in and out;
   * "linear" keeps a constant speed, for cyclic motion (pedalling, rowing, running).
   */
  ease?: "smooth" | "linear";
}

/** How a hand holds a handle: palm down/back, palm up/forward, or palms facing. */
export type GripStyle = "overhand" | "underhand" | "neutral";

/** Palm turn (forearm pronation, degrees) of each grip style. */
export const GRIP_TURN: Record<GripStyle, number> = { overhand: 175, underhand: 5, neutral: 90 };

export type Prop =
  | { type: "barbell"; at?: "hands" | "back"; plate?: "large" | "small"; grip?: GripStyle }
  /** `grip`: palm orientation on the handle (default neutral; curls use "underhand"). */
  | { type: "dumbbell"; hands?: "both" | "near" | "shared"; grip?: GripStyle }
  | { type: "kettlebell" }
  | {
      type: "bench";
      from: number;
      to: number;
      top: number;
      /** Optional incline back-rest: hinge x, length and angle in degrees. */
      incline?: { at: number; length: number; angle: number };
      /** Signed lateral offset of the bench centre, cm (negative = far side). */
      z?: number;
    }
  | { type: "box"; from: number; to: number; top: number; bottom?: number; width?: number; z?: number }
  | { type: "pullupBar"; y: number; x: number }
  /** `grip`: palm orientation on the handle (default overhand on a bar, neutral on a rope/single handle). */
  | { type: "cable"; pulley: [number, number]; handle: "bar" | "rope" | "single"; grip?: GripStyle }
  | { type: "mat" }
  /** Plug-in prop registered in src/lib/three/extra-props (EZ bar, dip bars, medicine ball…). */
  | { type: "extra"; kind: string; params?: Record<string, number | string | boolean> }
  /** A detailed equipment model from src/lib/three/equipment, placed on the floor at (x, z). */
  | { type: "equipment"; slug: string; x: number; z?: number; y?: number; rotate?: number; scale?: number };

export type CameraPreset = "front" | "back" | "side";

export interface Animation {
  frames: Keyframe[];
  props?: Prop[];
  camera?: CameraPreset;
}

export interface SideJoints {
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  hand: Vec3;
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  heel: Vec3;
  toe: Vec3;
  /** Unit direction the front of the arm (biceps) faces. */
  armFront: Vec3;
  /** Unit direction the front of the leg (quads/knee cap) faces. */
  legFront: Vec3;
  /** Wrist flexion in degrees (from the arm spec's `wrist`). */
  wristFlex?: number;
  /** Palm turn in degrees when the pose sets `grip`/`gripTurn`; undefined = the prop's style. */
  gripTurn?: number;
}

export interface Skeleton {
  pelvis: Vec3;
  chest: Vec3;
  neck: Vec3;
  head: Vec3;
  /** Unit vectors of the torso frame (pelvis). */
  up: Vec3;
  forward: Vec3;
  /** Pelvis side axis, towards side 0 (world +z unless the pose sets `orient`). */
  side: Vec3;
  /** Chest frame, which differs from the pelvis frame when the torso twists. */
  chestForward: Vec3;
  chestSide: Vec3;
  headUp: Vec3;
  headForward: Vec3;
  sides: [SideJoints, SideJoints];
}
