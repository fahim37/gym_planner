import * as THREE from "three";
import { MUSCLE_IDS } from "../../muscles";

/**
 * Materials of the procedural body. All of them skin the bind-pose mesh on
 * the GPU with dual-quaternion blending (no candy-wrapper collapse when the
 * forearm or upper arm twists), reading per-bone dual quaternions from a
 * small float texture.
 */

export const MUSCLE_COUNT = MUSCLE_IDS.length;

/** Uniforms shared by every body material (one set per rig). */
export interface BodyUniforms {
  uBoneDQ: { value: THREE.DataTexture };
  uMuscle: { value: Float32Array };
  uHover: { value: number };
  uFibreMap: { value: THREE.Texture };
  uPulse: { value: number };
  uDetail: { value: number };
  uSkin: { value: THREE.Color };
  uPrimary: { value: THREE.Color };
  uSecondary: { value: THREE.Color };
  uHoverColor: { value: THREE.Color };
  uShorts: { value: THREE.Color };
  uHair: { value: THREE.Color };
  uLine: { value: number };
  uFade: { value: number };
  /** Per (muscle, side) centre in bind space (cm): the local origin of the fibre projection. */
  uAnchor: { value: THREE.Vector3[] };
}

const DQ_PARS = /* glsl */ `
uniform highp sampler2D uBoneDQ;
attribute vec4 aBones;
attribute vec4 aWeights;
vec4 gR;
vec4 gD;
void dqFetch(float bone, out vec4 r, out vec4 d) {
  int b = int(bone + 0.5) * 2;
  r = texelFetch(uBoneDQ, ivec2(b, 0), 0);
  d = texelFetch(uBoneDQ, ivec2(b + 1, 0), 0);
}
void dqBlend() {
  vec4 r0; vec4 d0;
  dqFetch(aBones.x, r0, d0);
  gR = r0 * aWeights.x;
  gD = d0 * aWeights.x;
  vec4 r; vec4 d; float w;
  if (aWeights.y > 0.0) {
    dqFetch(aBones.y, r, d);
    w = dot(r0, r) < 0.0 ? -aWeights.y : aWeights.y;
    gR += r * w; gD += d * w;
  }
  if (aWeights.z > 0.0) {
    dqFetch(aBones.z, r, d);
    w = dot(r0, r) < 0.0 ? -aWeights.z : aWeights.z;
    gR += r * w; gD += d * w;
  }
  if (aWeights.w > 0.0) {
    dqFetch(aBones.w, r, d);
    w = dot(r0, r) < 0.0 ? -aWeights.w : aWeights.w;
    gR += r * w; gD += d * w;
  }
  float l = length(gR);
  gR /= l;
  gD /= l;
}
vec3 dqRot(vec3 v) {
  return v + 2.0 * cross(gR.xyz, cross(gR.xyz, v) + gR.w * v);
}
vec3 dqPos(vec3 p) {
  return dqRot(p) + 2.0 * (gR.w * gD.xyz - gD.w * gR.xyz + cross(gR.xyz, gD.xyz));
}
`;

const BODY_VERT_PARS = /* glsl */ `
${DQ_PARS}
uniform float uMuscle[${MUSCLE_COUNT}];
uniform vec3 uAnchor[${(MUSCLE_COUNT + 1) * 2}];
uniform float uHover;
attribute vec4 aInfo;
attribute vec4 aFibre;
attribute vec4 aExtra;
attribute vec2 aFibreUv;
attribute vec2 aSeg;
varying vec3 vHi;
varying vec4 vMat;
varying float vLip;
varying vec4 vSurf;
varying float vTone;
varying float vHairD;
varying vec2 vFibreUv;
varying vec3 vFibreView;
varying vec3 vEye;
`;

const BODY_FRAG_PARS = /* glsl */ `
uniform sampler2D uFibreMap;
uniform float uPulse;
uniform float uDetail;
uniform vec3 uSkin;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uHoverColor;
uniform vec3 uShorts;
uniform vec3 uHair;
uniform float uLine;
uniform float uFade;
varying vec3 vHi;
varying vec4 vMat;
varying float vLip;
varying vec4 vSurf;
varying float vTone;
varying float vHairD;
varying vec2 vFibreUv;
varying vec3 vFibreView;
varying vec3 vEye;
vec4 gFibre;
vec3 gHi;
`;

/** Material ids (see sdf.ts MAT_*): skin, shorts, hair, eye, nail, lip. */
const MATERIAL_FN = /* glsl */ `
float hairAmt() { return 1.0 - smoothstep( 0.0, 0.26, vHairD ); }
float matIs(float id) {
  if (id < 0.5) return clamp(1.0 - vMat.x - vMat.z - vMat.w - vLip - hairAmt(), 0.0, 1.0);
  if (id < 1.5) return vMat.x;
  if (id < 2.5) return hairAmt();
  if (id < 3.5) return vMat.z;
  if (id < 4.5) return vMat.w;
  return vLip;
}
`;

function patchLights(chunk: string) {
  // Wrapped, slightly red-shifted diffuse: light bleeds past the terminator like skin.
  return chunk.replace(
    "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );",
    `vec3 wrapW = vec3( 0.36, 0.22, 0.17 );
	vec3 wrapped = clamp( ( vec3( dot( geometryNormal, directLight.direction ) ) + wrapW ) / ( 1.0 + wrapW ), 0.0, 1.0 );
	reflectedLight.directDiffuse += wrapped * directLight.color * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );`,
  );
}

export function createBodyMaterial(u: BodyUniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${BODY_VERT_PARS}`)
      .replace("void main() {", "void main() {\n\tdqBlend();")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n\tobjectNormal = dqRot( objectNormal );")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
	transformed = dqPos( transformed );
	{
		int mid = int( aInfo.x + 0.5 );
		float st = mid < ${MUSCLE_COUNT} ? uMuscle[ mid ] : 0.0;
		float prim = step( 1.5, st );
		vec3 h1 = vec3( prim, step( 0.5, st ) * ( 1.0 - prim ), ( mid < ${MUSCLE_COUNT} && abs( float( mid ) - uHover ) < 0.5 ) ? 1.0 : 0.0 );
		int mid2 = int( aSeg.x + 0.5 );
		float st2 = mid2 < ${MUSCLE_COUNT} ? uMuscle[ mid2 ] : 0.0;
		float prim2 = step( 1.5, st2 );
		vec3 h2 = vec3( prim2, step( 0.5, st2 ) * ( 1.0 - prim2 ), ( mid2 < ${MUSCLE_COUNT} && abs( float( mid2 ) - uHover ) < 0.5 ) ? 1.0 : 0.0 );
		// Blend towards the neighbouring group by the dominance margin: the 0.5 isoline of the
		// interpolated result is the true (smooth) border between the two groups.
		vHi = mix( h2, h1, 0.5 + 0.5 * aSeg.y / 255.0 );
		vMat = vec4( aInfo.y == 1.0 ? 1.0 : 0.0, aInfo.y == 2.0 ? 1.0 : 0.0, aInfo.y == 3.0 ? 1.0 : 0.0, aInfo.y == 4.0 ? 1.0 : 0.0 );
		vLip = aInfo.y == 5.0 ? 1.0 : 0.0;
		vSurf = vec4( aInfo.z / 255.0, aInfo.w / 255.0, aExtra.x, aExtra.y );
		vTone = aExtra.z;
		vHairD = aExtra.w;
		vEye = aFibre.xyz * 2.0;
		vec3 fib = aFibre.xyz;
		// Project the fibre pattern about the muscle's own centre: a short lever arm keeps the
		// striations straight where the fibre direction turns (no swirling "wood grain").
		int slot = ( mid < ${MUSCLE_COUNT} ? mid : ${MUSCLE_COUNT} ) * 2 + ( position.z > 0.0 ? 1 : 0 );
		vec3 pcm = position * 100.0 - uAnchor[ slot ];
		vec3 bn = normalize( cross( normal, fib ) + 1e-5 );
		float sc = aInfo.y > 1.5 && aInfo.y < 2.5 ? 2.6 : ( aInfo.y > 0.5 && aInfo.y < 1.5 ? 3.0 : 1.0 );
		vFibreUv = ( aFibreUv.x < 1e5 ? aFibreUv / vec2( 12.0, 4.5 ) : vec2( dot( pcm, fib ) / 12.0, dot( pcm, bn ) / 4.5 ) ) * sc;
		vFibreView = normalize( normalMatrix * dqRot( fib ) );
	}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${BODY_FRAG_PARS}\n${MATERIAL_FN}`)
      .replace("#include <lights_physical_pars_fragment>", patchLights(THREE.ShaderChunk.lights_physical_pars_fragment))
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
	gFibre = texture2D( uFibreMap, vFibreUv );
	// Highlight membership is per vertex; resolve it at its interpolated 0.5 isoline with a
	// pixel-wide antialiased edge, so region borders run through edge midpoints instead of
	// following the triangle stair-steps.
	{
		vec3 hw = max( fwidth( vHi ), vec3( 1e-3 ) ) * 0.7;
		gHi = smoothstep( vec3( 0.5 ) - hw, vec3( 0.5 ) + hw, vHi );
	}
	{
		float skin = matIs( 0.0 );
		float shorts = matIs( 1.0 );
		float hair = matIs( 2.0 );
		float eye = matIs( 3.0 );
		float nail = matIs( 4.0 );
		float lip = matIs( 5.0 );
		vec3 base = uSkin;
		base = mix( base, uSkin * vec3( 1.06, 1.04, 1.05 ) + 0.02, vSurf.y );
		base = mix( base, uSkin * vec3( 0.93, 0.86, 0.86 ), lip );
		base = mix( base, uSkin * 1.12 + 0.04, nail + eye );
		base = mix( base, uShorts, shorts );
		base = mix( base, uHair, hair );
		// Iris and pupil from the eye-local position (exact under interpolation → always round).
		{
			float ir = length( vEye.yz );
			float aa = max( fwidth( ir ), 0.01 );
			float front = smoothstep( 0.2, 0.5, vEye.x );
			float iris = step( 0.999, eye ) * front * ( 1.0 - smoothstep( 0.55 - aa, 0.55 + aa, ir ) );
			float pupil = 1.0 - smoothstep( 0.21 - aa, 0.21 + aa, ir );
			float fleck = texture2D( uFibreMap, vec2( atan( vEye.z, vEye.y ) * 1.3, ir * 3.0 ) ).a;
			vec3 irisCol = mix( vec3( 0.25, 0.18, 0.13 ), vec3( 0.08, 0.06, 0.05 ), smoothstep( 0.3, 0.55, ir ) ) * ( 0.8 + 0.4 * fleck );
			base = mix( base, mix( irisCol, vec3( 0.012 ), pupil ), iris );
			// Sclera: slightly warm, darker towards the corners.
			base = mix( base, base * mix( 0.8, 1.0, front ), eye );
		}
		base *= 1.0 + vTone * 0.06;
		float muscle = skin + lip;
		float hi = clamp( gHi.x + gHi.y, 0.0, 1.0 ) * ( muscle + shorts );
		vec3 hiCol = ( uPrimary * gHi.x + uSecondary * gHi.y ) / max( gHi.x + gHi.y, 1e-3 );
		base = mix( base, hiCol, hi );
		base = mix( base, uHoverColor, gHi.z * ( muscle + shorts ) );
		// Grooves between fibres read slightly darker.
		float f = vSurf.x * uDetail * ( muscle + hair * 0.6 + shorts * 0.4 );
		base *= mix( 1.0, 0.72 + 0.28 * gFibre.a, f );
		diffuseColor.rgb = base;
	}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
	roughnessFactor = 0.56 - 0.2 * vSurf.y;
	roughnessFactor = mix( roughnessFactor, 0.9, matIs( 1.0 ) );
	roughnessFactor = mix( roughnessFactor, 0.62, matIs( 2.0 ) );
	roughnessFactor = mix( roughnessFactor, 0.12, matIs( 3.0 ) );
	roughnessFactor = mix( roughnessFactor, 0.3, matIs( 4.0 ) );
	roughnessFactor = mix( roughnessFactor, 0.42, clamp( gHi.x + gHi.y, 0.0, 1.0 ) * ( 1.0 - matIs( 1.0 ) ) );`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `{
		vec3 mapN = gFibre.xyz * 2.0 - 1.0;
		float k = vSurf.x * uDetail * clamp( 1.0 - matIs( 3.0 ) - matIs( 4.0 ), 0.0, 1.0 );
		k *= 1.0 - 0.45 * matIs( 1.0 );
		mapN.xy *= k;
		vec3 T = vFibreView - normal * dot( normal, vFibreView );
		float tl = length( T );
		if ( tl > 1e-4 ) {
			T /= tl;
			vec3 Bt = cross( normal, T );
			normal = normalize( T * mapN.x + Bt * mapN.y + normal * mapN.z );
		}
	}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
	totalEmissiveRadiance += uPrimary * gHi.x * ( 0.05 + 0.09 * uPulse ) * ( 1.0 - matIs( 1.0 ) * 0.5 );
	totalEmissiveRadiance += uHoverColor * gHi.z * 0.12;
	// Catchlight: a small soft highlight on the cornea, up and to the side.
	{
		vec2 cl = vEye.yz - vec2( 0.22, -0.16 );
		float c = step( 0.999, matIs( 3.0 ) ) * smoothstep( 0.2, 0.5, vEye.x ) * ( 1.0 - smoothstep( 0.05, 0.11, length( cl ) ) );
		totalEmissiveRadiance += vec3( 0.9 ) * c;
	}`,
      )
      .replace(
        "#include <aomap_fragment>",
        `{
		float ao = vSurf.w;
		reflectedLight.indirectDiffuse *= ao;
		reflectedLight.indirectSpecular *= ao * ao;
		reflectedLight.directDiffuse *= mix( 1.0, ao, 0.5 );
		reflectedLight.directSpecular *= mix( 1.0, ao, 0.7 );
	}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
		// Ink lines where two muscle groups meet, like an anatomy plate.
		// Constant screen-space width: distance to the zero crossing in pixels.
		float lv = vSurf.z;
		float px = abs( lv ) / max( fwidth( lv ), 1e-5 );
		float ink = 1.0 - smoothstep( 0.35, 1.35, px );
		// Only near real boundaries, and fading out where the field is too coarse to resolve.
		ink *= 1.0 - smoothstep( 0.25, 0.6, abs( lv ) );
		// …and where the field jumps (the nearest pair of groups switches), which would draw stair-steps.
		float slope = fwidth( lv ) / max( length( fwidth( vViewPosition ) ) * 100.0, 1e-4 );
		ink *= 1.0 - smoothstep( 2.5, 5.0, slope );
		ink *= uLine * matIs( 0.0 );
		outgoingLight = mix( outgoingLight, outgoingLight * 0.5, ink );
		// Soft contour at the silhouette.
		float ndv = abs( dot( normal, normalize( vViewPosition ) ) );
		outgoingLight *= mix( 0.72, 1.0, smoothstep( 0.04, 0.42, ndv ) );
	}
	#include <opaque_fragment>
	gl_FragColor.a *= uFade;`,
      );
  };
  mat.customProgramCacheKey = () => "ironform-body-v1";
  return mat;
}

/** Depth material for shadow maps (same skinning). */
export function createBodyDepthMaterial(u: BodyUniforms) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBoneDQ = u.uBoneDQ;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DQ_PARS}`)
      .replace("void main() {", "void main() {\n\tdqBlend();")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n\ttransformed = dqPos( transformed );");
  };
  mat.customProgramCacheKey = () => "ironform-body-depth-v1";
  return mat;
}

/** Writes the muscle index (+1, 0 = none) of each fragment, for GPU picking. */
export function createPickMaterial(u: BodyUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { uBoneDQ: u.uBoneDQ },
    vertexShader: /* glsl */ `
${DQ_PARS}
attribute vec4 aInfo;
flat varying float vId;
void main() {
  dqBlend();
  vId = aInfo.x < 254.5 ? aInfo.x + 1.0 : 0.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( dqPos( position ), 1.0 );
}`,
    fragmentShader: /* glsl */ `
flat varying float vId;
void main() {
  gl_FragColor = vec4( vId / 255.0, 0.0, 0.0, 1.0 );
}`,
  });
}
