import { notFound } from "next/navigation";
import CharacterLab from "./CharacterLab";

/**
 * Character lab (dev server only): the anatomy figure at full size with
 * query options for close-ups, poses and highlights, plus an FPS readout.
 *   /dev/character?view=front|back|side&focus=body|head|hand|torso|legs|foot
 *   &ex=<slug>&frame=<n>&hl=chest,biceps&sec=abs&play=1
 */
export default function CharacterPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CharacterLab />;
}
