import tgpu from 'typegpu'
import * as d from 'typegpu/data'

import { FOCUSED_LEVEL } from '../domain/illumination'
import { CORE_RADIUS, FIRST_YEAR, LAST_YEAR } from './layout'

/** Each filament is a quadratic arc drawn as a strip of this many pieces. */
const LINK_SEGMENTS = 28
export const LINK_VERTICES = (LINK_SEGMENTS + 1) * 2
export const QUAD_VERTICES = 6
/** Every pass renders additively into this half-float target in linear
 *  light; the composite blooms and tone-maps it once, in Jem's palette:
 *  smoky plum ground, pink, violet, aqua and pearl light, small warm
 *  flashes. */
export const HDR_FORMAT: GPUTextureFormat = 'rgba16float'

/** Stars grow as the camera leans in, within these bounds. Shared by the
 *  star shader and by picking, so what you click is what you see. */
const ZOOM_BOOST = { exponent: 0.42, minimum: 0.85, maximum: 2.6 } as const

export const zoomBoost = (zoom: number): number =>
  Math.min(
    Math.max(zoom ** ZOOM_BOOST.exponent, ZOOM_BOOST.minimum),
    ZOOM_BOOST.maximum,
  )

/** A star fades in over this window around its birth year. */
const BIRTH_LEAD_YEARS = 0.6
const BIRTH_TRAIL_YEARS = 0.3

/** Whether a star has visibly arrived by `epoch`: past the middle of its
 *  fade-in. */
export const isBorn = (year: number, epoch: number): boolean =>
  epoch >= year - (BIRTH_LEAD_YEARS - BIRTH_TRAIL_YEARS) / 2

const wgslFloat = (value: number): string => value.toFixed(4)
const core = wgslFloat(CORE_RADIUS)
const years = `const FIRST_YEAR = ${FIRST_YEAR.toFixed(1)}; const LAST_YEAR = ${LAST_YEAR.toFixed(1)};`

// SCHEMA

export const Frame = d
  .struct({
    resolution: d.vec2f,
    center: d.vec2f,
    /** Device pixels per world unit. */
    scale: d.f32,
    /** Camera zoom relative to the whole-galaxy view. */
    zoom: d.f32,
    time: d.f32,
    epoch: d.f32,
    pixelRatio: d.f32,
    dimming: d.f32,
  })
  .$name('Frame')

export const StarDatum = d
  .struct({
    position: d.vec2f,
    size: d.f32,
    year: d.f32,
    color: d.vec3f,
    /** 0 field, 1 theory, 2 language, 3 tool. */
    kind: d.f32,
  })
  .$name('StarDatum')

/** One filament. Field names avoid WGSL's reserved words: `from` and
 *  `target` are reserved. */
export const LinkDatum = d
  .struct({
    origin: d.vec2f,
    destination: d.vec2f,
    bend: d.vec2f,
    originYear: d.f32,
    destinationYear: d.f32,
    originColor: d.vec3f,
    echo: d.f32,
    destinationColor: d.vec3f,
    seed: d.f32,
  })
  .$name('LinkDatum')

export const Nebula = d
  .struct({
    position: d.vec2f,
    radius: d.f32,
    year: d.f32,
    color: d.vec3f,
    glow: d.f32,
  })
  .$name('Nebula')

export const Sector = d
  .struct({
    angle: d.f32,
    spread: d.f32,
    weight: d.f32,
    color: d.vec3f,
  })
  .$name('Sector')

export const sceneLayout = tgpu.bindGroupLayout({
  frame: { uniform: Frame },
  stars: { storage: (count: number) => d.arrayOf(StarDatum, count) },
  /** Per star: level, tint, hover, visibility. */
  starGlow: { storage: (count: number) => d.arrayOf(d.vec4f, count) },
  links: { storage: (count: number) => d.arrayOf(LinkDatum, count) },
  /** Per link, two vec4s: (level, tint, flow, visibility) and (thread rgb, mix). */
  linkGlow: { storage: (count: number) => d.arrayOf(d.vec4f, count) },
  nebulae: { storage: (count: number) => d.arrayOf(Nebula, count) },
  sectors: { storage: (count: number) => d.arrayOf(Sector, count) },
})

export const textureLayout = tgpu.bindGroupLayout({
  source: { texture: d.texture2d(d.f32) },
  linear: { sampler: 'filtering' },
})

export const compositeLayout = tgpu.bindGroupLayout({
  frame: { uniform: Frame },
  scene: { texture: d.texture2d(d.f32) },
  bloom: { texture: d.texture2d(d.f32) },
  linear: { sampler: 'filtering' },
})

/** WGSL bodies name bound resources plainly (`frame`, `stars`); TypeGPU 0.12
 *  reaches them through the layout's `$` accessor, so qualify them here. */
const bindTo =
  (layoutName: string, keys: ReadonlyArray<string>) =>
  (code: string): string =>
    keys.reduce(
      (body, key) =>
        body.replace(
          new RegExp(`(?<![.\\w$])${key}\\b`, 'g'),
          `${layoutName}.$.${key}`,
        ),
      code,
    )

const sceneKeys = [
  'frame',
  'stars',
  'starGlow',
  'links',
  'linkGlow',
  'nebulae',
  'sectors',
]
const inScene = bindTo('scene', sceneKeys)
const inTexture = bindTo('texture', ['source', 'linear'])
const inComposite = bindTo('composite', ['frame', 'scene', 'bloom', 'linear'])

// SHARED FUNCTIONS

const radiusOfYear = tgpu.fn(
  [d.f32],
  d.f32,
)(`(year: f32) -> f32 {
  ${years}
  return ${core} + (1.0 - ${core}) * (clamp(year, FIRST_YEAR, LAST_YEAR) - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR);
}`)

const yearOfRadius = tgpu.fn(
  [d.f32],
  d.f32,
)(`(radius: f32) -> f32 {
  ${years}
  return FIRST_YEAR + (radius - ${core}) / (1.0 - ${core}) * (LAST_YEAR - FIRST_YEAR);
}`)

const hash21 = tgpu.fn(
  [d.vec2f],
  d.f32,
)(`(p: vec2f) -> f32 {
  let q = fract(p * vec2f(123.34, 456.21));
  let r = q + dot(q, q + 45.32);
  return fract(r.x * r.y);
}`)

const valueNoise = tgpu
  .fn(
    [d.vec2f],
    d.f32,
  )(`(p: vec2f) -> f32 {
  let cell = floor(p);
  let local = fract(p);
  let blend = local * local * (3.0 - 2.0 * local);
  let a = hash21(cell);
  let b = hash21(cell + vec2f(1.0, 0.0));
  let c = hash21(cell + vec2f(0.0, 1.0));
  let e = hash21(cell + vec2f(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, e, blend.x), blend.y);
}`)
  .$uses({ hash21 })

const fbm = tgpu
  .fn(
    [d.vec2f],
    d.f32,
  )(`(p: vec2f) -> f32 {
  var total = 0.0;
  var amplitude = 0.5;
  var q = p;
  for (var octave = 0; octave < 4; octave++) {
    total += valueNoise(q) * amplitude;
    q = mat2x2f(1.6, 1.2, -1.2, 1.6) * q + vec2f(3.1, 1.7);
    amplitude *= 0.5;
  }
  return total;
}`)
  .$uses({ valueNoise })

/** Jem's closed spectral ribbon: pink, violet, aqua, pearl, pink, orange,
 *  gold, pink. Linear-light approximations of the site's film gradient. */
const spectrum = tgpu.fn(
  [d.f32],
  d.vec3f,
)(`(phase: f32) -> vec3f {
  var stops = array<vec3f, 8>(
    vec3f(1.0, 0.188, 0.753),
    vec3f(0.552, 0.188, 1.0),
    vec3f(0.188, 0.468, 1.0),
    vec3f(0.823, 0.807, 0.855),
    vec3f(1.0, 0.188, 0.753),
    vec3f(1.0, 0.196, 0.004),
    vec3f(1.0, 0.768, 0.105),
    vec3f(1.0, 0.188, 0.753),
  );
  let position = fract(phase / 6.28318530718) * 7.0;
  let index = u32(floor(position));
  let next = min(index + 1u, 7u);
  return mix(stops[index], stops[next], smoothstep(0.0, 1.0, fract(position)));
}`)

const wrapAngle = tgpu.fn(
  [d.f32],
  d.f32,
)(`(angle: f32) -> f32 {
  return angle - 6.28318530718 * round(angle / 6.28318530718);
}`)

const twinkleField = tgpu
  .fn(
    [d.vec2f, d.f32, d.f32],
    d.f32,
  )(`(p: vec2f, seed: f32, time: f32) -> f32 {
  let cell = floor(p);
  let random = hash21(cell + seed);
  let offset = vec2f(0.2 + random * 0.6, 0.2 + fract(random * 13.73) * 0.6);
  let point = fract(p) - offset;
  let twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(time * (0.55 + random) + random * 41.0), 2.0);
  return exp(-dot(point, point) * 320.0) * twinkle * smoothstep(0.86, 0.99, random);
}`)
  .$uses({ hash21 })

const toLinearTint = `
  let warm = vec3f(1.0, 0.42, 0.36);
  let cool = vec3f(0.36, 0.78, 1.0);
`

// FULL-SCREEN TRIANGLE

export const fullscreenVertex = tgpu.vertexFn({
  in: { vertexIndex: d.builtin.vertexIndex },
  out: { position: d.builtin.position, uv: d.vec2f },
})(`{
  var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let corner = corners[vertexIndex];
  var out: Out;
  out.position = vec4f(corner, 0.0, 1.0);
  out.uv = corner * vec2f(0.5, -0.5) + vec2f(0.5);
  return out;
}`)

// SKY: ground, galactic disc, tradition wedges, decade rings, the epoch's
// light-front, field nebulae, stardust and the luminous λ core.

export const skyFragment = tgpu
  .fragmentFn({
    in: { position: d.builtin.position, uv: d.vec2f },
    out: d.vec4f,
  })(
    inScene(`{
  let px = position.xy;
  let world = frame.center + (px - frame.resolution * 0.5) / frame.scale;
  let radius = length(world);
  let angle = atan2(world.x, -world.y);
  let time = frame.time;
  let pixel = 1.0 / frame.scale;
  let epochRadius = radiusOfYear(frame.epoch);

  let ground = vec3f(0.0103, 0.0080, 0.0123);
  let plum = vec3f(0.0242, 0.0185, 0.0319);
  let dusk = vec3f(0.0578, 0.0296, 0.0782);
  var color = mix(dusk, plum, smoothstep(0.0, 0.9, radius));
  color = mix(color, ground, smoothstep(0.85, 2.2, radius));

  // A slow two-armed spiral in the disc, more felt than seen.
  let swirl = 2.0 * angle - 5.2 * log(radius + 0.06) + time * 0.012;
  let arms = pow(0.5 + 0.5 * cos(swirl), 3.0) * smoothstep(1.15, 0.12, radius);
  let cloud = fbm(world * 3.4 + vec2f(time * 0.004, 0.0));
  color += vec3f(0.11, 0.05, 0.16) * arms * (0.25 + cloud * 0.5) * 0.35;
  color += vec3f(0.16, 0.07, 0.22) * exp(-radius * radius * 2.6) * 0.32;

  // Tradition wedges tint their slice of sky.
  let sectorCount = arrayLength(&sectors);
  for (var index = 0u; index < sectorCount; index++) {
    let sector = sectors[index];
    let offset = abs(wrapAngle(angle - sector.angle));
    let wedge = smoothstep(sector.spread + 0.03, sector.spread - 0.05, offset);
    let band = smoothstep(0.08, 0.3, radius) * smoothstep(1.16, 0.92, radius);
    color += sector.color * wedge * band * 0.022 * sector.weight;
  }

  // Decade rings, brighter at each half-century, drawn only for the past.
  let year = yearOfRadius(radius);
  let decade = round(year / 10.0) * 10.0;
  if (decade >= 1930.0 && decade <= 2020.0) {
    let distance = abs(radius - radiusOfYear(decade)) / pixel / frame.pixelRatio;
    let isHalfCentury = abs(decade - round(decade / 50.0) * 50.0) < 0.5;
    let strength = select(0.05, 0.11, isHalfCentury);
    let past = smoothstep(decade + 0.5, decade - 1.0, frame.epoch);
    color += vec3f(0.85, 0.76, 0.95) * exp(-distance * distance * 0.9) * strength * past;
  }

  // The future is a veil: beyond the epoch ring the sky darkens.
  let beyond = smoothstep(epochRadius, epochRadius + 0.06, radius);
  color *= mix(1.0, 0.55, beyond);

  // Field nebulae: diffuse clouds of borrowed ideas.
  let nebulaCount = arrayLength(&nebulae);
  for (var index = 0u; index < nebulaCount; index++) {
    let nebula = nebulae[index];
    let local = (world - nebula.position) / nebula.radius;
    let warp = vec2f(fbm(local * 1.7 + nebula.year), fbm(local * 1.7 - nebula.year)) - 0.5;
    let shape = exp(-dot(local + warp * 0.55, local + warp * 0.55) * 1.4);
    let wisps = fbm(local * 3.1 + vec2f(time * 0.01, nebula.year * 0.1));
    let birth = smoothstep(nebula.year - 3.0, nebula.year + 2.0, frame.epoch);
    color += nebula.color * shape * (0.35 + wisps * 0.9) * 0.15 * nebula.glow * birth;
  }

  // The light-front of the present: an aurora riding the epoch ring.
  let front = (radius - epochRadius) / pixel / frame.pixelRatio;
  let ribbon = spectrum(angle * 2.0 + time * 0.16 + radius * 9.0);
  let line = exp(-front * front * 0.18);
  let wake = exp(-max(-front, 0.0) * 0.012) * step(front, 0.0);
  let shimmer = 0.6 + 0.4 * sin(angle * 9.0 - time * 0.7);
  color += ribbon * line * 0.55 * shimmer;
  color += ribbon * wake * 0.035 * smoothstep(0.1, 0.3, epochRadius);

  // Outer silk: the loop of light that frames Jem's sky.
  let silkRadius = 1.075 + 0.02 * sin(angle * 3.0 + time * 0.13) + 0.012 * sin(angle * 5.0 - time * 0.1);
  let silk = exp(-pow((radius - silkRadius) * 26.0, 2.0));
  color += spectrum(angle * 2.0 - time * 0.12 + 2.0) * silk * 0.075;

  // Stardust in three depths; the farthest barely moves with the camera.
  let screen = (px - frame.resolution * 0.5) / min(frame.resolution.x, frame.resolution.y);
  let near = twinkleField(world * 46.0, 7.0, time);
  let middle = twinkleField(world * 0.45 * 46.0 + screen * 14.0, 19.0, time * 0.8);
  let far = twinkleField(screen * 60.0 + frame.center * 6.0, 29.0, time * 0.6);
  color += vec3f(0.75, 0.84, 1.0) * (near * 0.5 + middle * 0.32 + far * 0.22);

  // The core: λ, where every lineage begins.
  color += vec3f(1.0, 0.82, 0.98) * (exp(-radius * radius * 1400.0) * 2.4 + exp(-radius * 22.0) * 0.12);

  let recede = mix(1.0, 0.78, frame.dimming);
  return vec4f(color * recede, 1.0);
}`),
  )
  .$uses({
    scene: sceneLayout,
    radiusOfYear,
    yearOfRadius,
    fbm,
    spectrum,
    wrapAngle,
    twinkleField,
  })

// FILAMENTS: each link is a quadratic arc from ancestor to descendant,
// extruded in screen space so its width is constant in pixels.

export const linkVertex = tgpu
  .vertexFn({
    in: {
      vertexIndex: d.builtin.vertexIndex,
      instanceIndex: d.builtin.instanceIndex,
    },
    out: {
      position: d.builtin.position,
      along: d.vec2f,
      halfWidth: d.f32,
      link: d.interpolate('flat', d.u32),
    },
  })(
    inScene(`{
  let link = links[instanceIndex];
  let glow = linkGlow[instanceIndex * 2u];
  let segment = vertexIndex / 2u;
  let side = f32(vertexIndex % 2u) * 2.0 - 1.0;
  let t = f32(segment) / ${LINK_SEGMENTS.toFixed(1)};
  let inverse = 1.0 - t;
  let point = inverse * inverse * link.origin + 2.0 * inverse * t * link.bend + t * t * link.destination;
  let tangent = 2.0 * inverse * (link.bend - link.origin) + 2.0 * t * (link.destination - link.bend);
  let direction = normalize(tangent * frame.scale + vec2f(1e-6, 0.0));
  let normal = vec2f(-direction.y, direction.x);
  let level = glow.x;
  let halfWidth = (0.45 + glow.z * min(level, 1.4) * 0.85) * frame.pixelRatio;
  let screen = (point - frame.center) * frame.scale + frame.resolution * 0.5 + normal * side * (halfWidth + 2.5 * frame.pixelRatio);
  let clip = screen / frame.resolution * 2.0 - 1.0;
  var out: Out;
  out.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
  out.along = vec2f(t, side * (halfWidth + 2.5 * frame.pixelRatio));
  out.halfWidth = halfWidth;
  out.link = instanceIndex;
  return out;
}`),
  )
  .$uses({
    scene: sceneLayout,
  })

export const linkFragment = tgpu
  .fragmentFn({
    in: {
      along: d.vec2f,
      halfWidth: d.f32,
      link: d.interpolate('flat', d.u32),
    },
    out: d.vec4f,
  })(
    inScene(`{
  let link = links[in.link];
  let glow = linkGlow[in.link * 2u];
  let thread = linkGlow[in.link * 2u + 1u];
  let t = in.along.x;
  ${toLinearTint}

  // Light leaves the ancestor about two years before the descendant is
  // born, and arrives just as it flares into being.
  let growth = clamp((frame.epoch - (link.destinationYear - 2.5)) / 2.5, 0.0, 1.0);
  if (t > growth + 0.001 || glow.w < 0.01) {
    discard;
  }

  let offset = abs(in.along.y);
  let profile = smoothstep(in.halfWidth + 1.4 * frame.pixelRatio, in.halfWidth * 0.2, offset);
  let core = exp(-offset * offset / (in.halfWidth * in.halfWidth + 0.01) * 1.8);
  let span = distance(link.origin, link.destination) * 40.0 + 2.0;

  var color = mix(link.originColor, link.destinationColor, smoothstep(0.1, 0.9, t));
  color = mix(color, warm, max(-glow.y, 0.0) * 0.4);
  color = mix(color, cool, max(glow.y, 0.0) * 0.4);
  color = mix(color, thread.rgb, thread.a);

  // Resting filaments are a faint web; lit ones (flowing) carry the story.
  let resting = mix(0.075 * glow.x, 0.2 + 0.12 * glow.x, glow.z);
  let pulse = glow.z * pow(0.5 + 0.5 * sin(t * span - frame.time * 2.6 + link.seed * 6.2831), 14.0) * 1.6;
  let head = (1.0 - step(1.0, growth)) * exp(-(growth - t) * 26.0) * 2.5;
  let dashes = select(1.0, step(0.42, fract(t * span * 0.6)), link.echo > 0.5);
  let echoFade = select(1.0, 0.6, link.echo > 0.5);
  let intensity = (resting + pulse + head) * echoFade;
  let alpha = (profile * 0.65 + core * 0.6) * dashes * glow.w;
  return vec4f(color * intensity * alpha, 0.0);
}`),
  )
  .$uses({
    scene: sceneLayout,
  })

// STARS: languages flare with four-point diffraction spikes, theories ring
// like pulsars, tools are thin-film orbs with a little orbit, fields are
// faint asterisks at the heart of their nebula.

export const starVertex = tgpu
  .vertexFn({
    in: {
      vertexIndex: d.builtin.vertexIndex,
      instanceIndex: d.builtin.instanceIndex,
    },
    out: {
      position: d.builtin.position,
      local: d.vec2f,
      radius: d.f32,
      star: d.interpolate('flat', d.u32),
    },
  })(
    inScene(`{
  let star = stars[instanceIndex];
  let glow = starGlow[instanceIndex];
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let corner = corners[vertexIndex];
  let since = frame.epoch - star.year;
  let flare = exp(-max(since, 0.0) * 1.1) * step(-0.5, since);
  let zoomBoost = clamp(pow(frame.zoom, ${wgslFloat(ZOOM_BOOST.exponent)}), ${wgslFloat(ZOOM_BOOST.minimum)}, ${wgslFloat(ZOOM_BOOST.maximum)});
  let emphasis = 0.72 + 0.28 * min(glow.x, 1.8);
  let radius = star.size * frame.pixelRatio * zoomBoost * emphasis * (1.0 + flare * 1.4) * (1.0 + glow.z * 0.3);
  let extent = radius * 7.0;
  let screen = (star.position - frame.center) * frame.scale + frame.resolution * 0.5 + corner * extent;
  let clip = screen / frame.resolution * 2.0 - 1.0;
  var out: Out;
  out.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
  out.local = corner * extent;
  out.radius = radius;
  out.star = instanceIndex;
  return out;
}`),
  )
  .$uses({
    scene: sceneLayout,
  })

export const starFragment = tgpu
  .fragmentFn({
    in: { local: d.vec2f, radius: d.f32, star: d.interpolate('flat', d.u32) },
    out: d.vec4f,
  })(
    inScene(`{
  let star = stars[in.star];
  let glow = starGlow[in.star];
  let birth = smoothstep(star.year - ${wgslFloat(BIRTH_LEAD_YEARS)}, star.year + ${wgslFloat(BIRTH_TRAIL_YEARS)}, frame.epoch);
  let visible = glow.w * birth;
  if (visible < 0.005) {
    discard;
  }
  ${toLinearTint}
  let q = in.local / in.radius;
  let d = length(q);
  let time = frame.time;
  let seed = fract(f32(in.star) * 0.6180339);
  let level = glow.x;

  var color = star.color;
  color = mix(color, warm, max(-glow.y, 0.0) * 0.35);
  color = mix(color, cool, max(glow.y, 0.0) * 0.35);
  let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  color = mix(vec3f(luminance) * vec3f(0.85, 0.8, 1.0), color, clamp(level * 1.4, 0.25, 1.0));

  var light = vec3f(0.0);
  if (star.kind < 0.5) {
    // Field: a soft six-point asterisk.
    let a = atan2(q.y, q.x);
    let petals = pow(0.5 + 0.5 * cos(a * 6.0 + time * 0.1), 6.0);
    light = color * (exp(-d * d * 1.2) * 0.9 + exp(-d * 0.9) * petals * 0.22);
  } else if (star.kind < 1.5) {
    // Theory: a pearl pulsar with a ring that keeps leaving.
    let ring = exp(-pow((d - 1.9) / 0.2, 2.0)) * 0.85;
    let wave = fract(time * 0.22 + seed);
    let echo = exp(-pow((d - 1.9 - wave * 3.0) / 0.25, 2.0)) * (1.0 - wave) * 0.45;
    let pearl = mix(color, vec3f(0.92, 0.9, 1.0), 0.55);
    light = pearl * (ring + echo) + vec3f(1.0, 0.95, 1.0) * exp(-d * d * 5.0) * 1.5 + color * exp(-d * 1.1) * 0.12;
  } else if (star.kind < 2.5) {
    // Language: hot core, coloured halo, four diffraction spikes.
    let core = exp(-d * d * 1.7) * 2.3;
    let halo = exp(-d * 0.85) * 0.2;
    let aq = abs(q);
    let spikes = exp(-aq.x * 0.75 - aq.y * 13.0) + exp(-aq.y * 0.75 - aq.x * 13.0);
    let diagonal = vec2f(q.x + q.y, q.x - q.y) * 0.7071;
    let ad = abs(diagonal);
    let faint = (exp(-ad.x * 1.6 - ad.y * 18.0) + exp(-ad.y * 1.6 - ad.x * 18.0)) * 0.25;
    light = mix(color, vec3f(1.0), 0.55) * core + color * (halo + (spikes * 0.6 + faint) * min(level, 1.4));
  } else {
    // Tool: a thin-film orb with a tilted orbit and a small moon.
    let a = atan2(q.y, q.x);
    let film = spectrum(a + time * 0.5 + d * 3.0 + seed * 6.0);
    let orb = exp(-d * d * 2.4) * 1.5;
    let rim = exp(-pow((d - 0.95) / 0.18, 2.0)) * 0.6;
    let tilt = seed * 3.14159;
    let rotated = vec2f(cos(tilt) * q.x - sin(tilt) * q.y, sin(tilt) * q.x + cos(tilt) * q.y);
    let ellipse = abs(length(rotated / vec2f(2.7, 0.95)) - 1.0);
    let orbit = exp(-ellipse * ellipse * 900.0) * 0.5;
    let moonAngle = time * (0.6 + seed) + seed * 9.0;
    let moonLocal = vec2f(cos(moonAngle) * 2.7, sin(moonAngle) * 0.95);
    let moon = exp(-dot(rotated - moonLocal, rotated - moonLocal) * 9.0) * 1.2;
    light = mix(color, film, 0.55) * (orb + rim) + mix(color, vec3f(1.0), 0.4) * (orbit + moon) + color * exp(-d * 1.0) * 0.12;
  }

  // Focus: a slow dashed halo. Hover: a thin ring.
  let focus = smoothstep(${wgslFloat(FOCUSED_LEVEL - 0.25)}, ${wgslFloat(FOCUSED_LEVEL - 0.05)}, level);
  let a = atan2(q.y, q.x);
  let dashes = step(0.5, fract(a * 1.909 + time * 0.08));
  let halo = exp(-pow((d - 3.3) / 0.12, 2.0)) * dashes * focus * 0.9;
  let hoverRing = exp(-pow((d - 2.7) / 0.1, 2.0)) * glow.z * 0.8;
  light += spectrum(a + time * 0.3) * halo + vec3f(1.0, 0.9, 1.0) * hoverRing;

  let since = frame.epoch - star.year;
  let flare = exp(-max(since, 0.0) * 1.1) * step(-0.5, since);
  light += vec3f(1.0, 0.85, 0.98) * exp(-d * d * 0.35) * flare * 1.5;

  let intensity = mix(0.16, 1.0, smoothstep(0.1, 1.0, level)) + max(level - 1.0, 0.0) * 0.9;
  return vec4f(light * intensity * visible, 0.0);
}`),
  )
  .$uses({
    scene: sceneLayout,
    spectrum,
  })

// BLOOM: a 13-tap downsample chain and a tent-filtered upsample, the dual
// filter used across modern film-look renderers.

const downsampleBody = (isPrefilter: boolean) => `{
  let texel = 1.0 / vec2f(textureDimensions(source));
  let uv = in.uv;
  let a = textureSample(source, linear, uv + texel * vec2f(-2.0, -2.0)).rgb;
  let b = textureSample(source, linear, uv + texel * vec2f(0.0, -2.0)).rgb;
  let c = textureSample(source, linear, uv + texel * vec2f(2.0, -2.0)).rgb;
  let west = textureSample(source, linear, uv + texel * vec2f(-2.0, 0.0)).rgb;
  let centre = textureSample(source, linear, uv).rgb;
  let east = textureSample(source, linear, uv + texel * vec2f(2.0, 0.0)).rgb;
  let g = textureSample(source, linear, uv + texel * vec2f(-2.0, 2.0)).rgb;
  let south = textureSample(source, linear, uv + texel * vec2f(0.0, 2.0)).rgb;
  let i = textureSample(source, linear, uv + texel * vec2f(2.0, 2.0)).rgb;
  let j = textureSample(source, linear, uv + texel * vec2f(-1.0, -1.0)).rgb;
  let k = textureSample(source, linear, uv + texel * vec2f(1.0, -1.0)).rgb;
  let l = textureSample(source, linear, uv + texel * vec2f(-1.0, 1.0)).rgb;
  let m = textureSample(source, linear, uv + texel * vec2f(1.0, 1.0)).rgb;
  var color = centre * 0.125 + (a + c + g + i) * 0.03125 + (b + west + east + south) * 0.0625 + (j + k + l + m) * 0.125;
  ${
    isPrefilter
      ? `let brightness = max(color.r, max(color.g, color.b));
  let knee = 0.35;
  let threshold = 0.32;
  let soft = clamp(brightness - threshold + knee, 0.0, 2.0 * knee);
  let contribution = max(soft * soft / (4.0 * knee + 1e-4), brightness - threshold) / max(brightness, 1e-4);
  color = color * contribution;`
      : ''
  }
  return vec4f(color, 1.0);
}`

export const prefilterFragment = tgpu
  .fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(inTexture(downsampleBody(true)))
  .$uses({
    texture: textureLayout,
  })

export const downsampleFragment = tgpu
  .fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(inTexture(downsampleBody(false)))
  .$uses({
    texture: textureLayout,
  })

export const upsampleFragment = tgpu
  .fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(
    inTexture(`{
  let texel = 1.0 / vec2f(textureDimensions(source));
  let uv = in.uv;
  var color = textureSample(source, linear, uv).rgb * 4.0;
  color += textureSample(source, linear, uv + texel * vec2f(-1.0, 0.0)).rgb * 2.0;
  color += textureSample(source, linear, uv + texel * vec2f(1.0, 0.0)).rgb * 2.0;
  color += textureSample(source, linear, uv + texel * vec2f(0.0, -1.0)).rgb * 2.0;
  color += textureSample(source, linear, uv + texel * vec2f(0.0, 1.0)).rgb * 2.0;
  color += textureSample(source, linear, uv + texel * vec2f(-1.0, -1.0)).rgb;
  color += textureSample(source, linear, uv + texel * vec2f(1.0, -1.0)).rgb;
  color += textureSample(source, linear, uv + texel * vec2f(-1.0, 1.0)).rgb;
  color += textureSample(source, linear, uv + texel * vec2f(1.0, 1.0)).rgb;
  return vec4f(color / 16.0, 1.0);
}`),
  )
  .$uses({
    texture: textureLayout,
  })

// COMPOSITE: bloom, gentle exponential tone-map that keeps pinks pink,
// vignette, film grain, then encode to sRGB for the canvas.

export const compositeFragment = tgpu
  .fragmentFn({
    in: { position: d.builtin.position, uv: d.vec2f },
    out: d.vec4f,
  })(
    inComposite(`{
  let base = textureSample(scene, linear, in.uv).rgb;
  let glow = textureSample(bloom, linear, in.uv).rgb;
  var color = base + glow * 0.85;
  color = vec3f(1.0) - exp(-color * 1.25);
  let centered = in.uv - 0.5;
  let vignette = 1.0 - dot(centered, centered) * 0.55;
  color *= vignette;
  let grain = fract(sin(dot(position.xy + frame.time * 61.0, vec2f(12.9898, 78.233))) * 43758.5453) - 0.5;
  color += grain * 0.012;
  let low = color * 12.92;
  let high = 1.055 * pow(max(color, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  let encoded = select(high, low, color <= vec3f(0.0031308));
  return vec4f(clamp(encoded, vec3f(0.0), vec3f(1.0)), 1.0);
}`),
  )
  .$uses({
    composite: compositeLayout,
  })
