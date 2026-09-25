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
}

export type Prop =
  | { type: "barbell"; at?: "hands" | "back"; plate?: "large" | "small" }
  | { type: "dumbbell"; hands?: "both" | "near" | "shared" }
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
  | { type: "cable"; pulley: [number, number]; handle: "bar" | "rope" | "single" }
  | { type: "mat" };

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
}

export interface Skeleton {
  pelvis: Vec3;
  chest: Vec3;
  neck: Vec3;
  head: Vec3;
  /** Unit vectors of the torso frame (pelvis). */
  up: Vec3;
  forward: Vec3;
  /** Chest frame, which differs from the pelvis frame when the torso twists. */
  chestForward: Vec3;
  chestSide: Vec3;
  headUp: Vec3;
  headForward: Vec3;
  sides: [SideJoints, SideJoints];
}
