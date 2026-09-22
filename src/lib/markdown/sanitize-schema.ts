import { defaultSchema } from 'rehype-sanitize'
import type { Schema } from 'hast-util-sanitize'

type SchemaAttributeList = NonNullable<NonNullable<Schema['attributes']>[string]>

type SanitizeContribution = {
  classTokens?: string[]
  divStylePatterns?: RegExp[]
  divAttrs?: string[]
  extraAttributes?: Record<string, SchemaAttributeList>
}

const extensionSanitize = import.meta.glob<SanitizeContribution>(
  '../../../extensions/*/lib/sanitize.ts',
  { eager: true }
)

const contributions = Object.values(extensionSanitize)
const extraClassTokens = contributions.flatMap((module) => module.classTokens ?? [])
const extraDivStyles = contributions.flatMap((module) => module.divStylePatterns ?? [])
const extraDivAttrs = contributions.flatMap((module) => module.divAttrs ?? [])

function mergedExtraAttributes(): Record<string, SchemaAttributeList> {
  const merged: Record<string, SchemaAttributeList> = {}
  for (const module of contributions) {
    for (const [tag, attrs] of Object.entries(module.extraAttributes ?? {})) {
      merged[tag] = [...(merged[tag] ?? []), ...attrs]
    }
  }
  return merged
}

const extensionAttributes = mergedExtraAttributes()

const wikiClassPattern = new RegExp(
  `^(alert|alert-info|alert-warning|wiki-|infobox-|imagebox-|user-template|template-missing${extraClassTokens.map((token) => `|${token}`).join('')})`
)

const infoboxImageSizeStylePattern = /^width: \d{1,3}%; max-width: \d{1,3}%;?$/
const imageboxGridStylePattern =
  /^(--imagebox-cols: [1-4]; )?grid-template-columns: repeat\([1-4], minmax\(0, 1fr\)\);?$/

/** Sanitize schema extended for wiki templates, infoboxes, Shiki output, and footnotes. */
export const wikiSanitizeSchema: Schema = {
  ...defaultSchema,
  // Clean heading fragment ids (#getting-started) in URLs and sidebar.
  clobberPrefix: '',
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'aside',
    'section',
    'figure',
    'figcaption',
    'svg',
    'line',
    'path',
    'circle'
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter(
        (entry) => !(Array.isArray(entry) && entry[0] === 'className')
      ),
      // className values must share one tuple or only the last tuple is used.
      ['className', 'data-footnote-backref', 'redlink']
    ],
    aside: [['className', 'wiki-infobox', 'not-prose']],
    figure: [
      ['className', 'wiki-imagebox', 'not-prose', 'imagebox-long-captions', /^imagebox-/],
      'dataId'
    ],
    figcaption: [['className', /^imagebox-/]],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', /^imagebox-/]],
    section: [['className', 'footnotes']],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['className', wikiClassPattern],
      ['style', imageboxGridStylePattern, /^--imagebox-cols: [1-4];?$/, ...extraDivStyles],
      'dataWikiPages',
      ...extraDivAttrs
    ],
    table: [...(defaultSchema.attributes?.table ?? []), ['className', 'infobox-data']],
    th: ['scope', 'colSpan', ['className', /^infobox-/], ...(defaultSchema.attributes?.th ?? [])],
    td: ['colSpan', ['className', /^infobox-/], ...(defaultSchema.attributes?.td ?? [])],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'alt',
      'dataSize',
      ['style', infoboxImageSizeStylePattern]
    ],
    code: [['className', /.*/]],
    pre: [['className', /.*/]],
    svg: [
      'xmlns',
      'width',
      'height',
      'viewBox',
      'fill',
      'stroke',
      'stroke-width',
      'aria-hidden',
      ['className', /.*/]
    ],
    line: ['x1', 'y1', 'x2', 'y2', ...(extensionAttributes.line ?? [])],
    path: ['d'],
    circle: ['cx', 'cy', 'r']
  },
  protocols: defaultSchema.protocols
}
