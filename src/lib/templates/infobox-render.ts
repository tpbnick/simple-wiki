import {
  infoboxDataFromParams,
  renderInfoboxHtml,
  type InfoboxEntry,
  type InfoboxTextEntry
} from './infobox-editor.js'

interface InfoboxConfig {
  fieldOrder?: string[]
  labelMap?: Record<string, string>
}

const VARIANT_CONFIGS: Record<string, InfoboxConfig> = {
  Country: {
    fieldOrder: ['capital', 'area', 'population', 'currency', 'language', 'government'],
    labelMap: {
      capital: 'Capital',
      area: 'Area',
      population: 'Population',
      currency: 'Currency',
      language: 'Language(s)',
      government: 'Government'
    }
  },
  Person: {
    fieldOrder: ['born', 'died', 'nationality', 'occupation', 'known_for'],
    labelMap: {
      born: 'Born',
      died: 'Died',
      nationality: 'Nationality',
      occupation: 'Occupation',
      known_for: 'Known for'
    }
  }
}

/**
 * Renders the built-in infobox template as HTML.
 * @param params - Template parameters from the wiki source.
 * @param variant - Optional named variant, such as `Country` or `Person`.
 */
export function renderInfobox(params: Record<string, string>, variant?: string): string {
  const templateName = variant ? `Infobox ${variant}` : 'Infobox'
  const data = infoboxDataFromParams(params, templateName)

  if (variant && VARIANT_CONFIGS[variant]) {
    data.entries = sortVariantEntries(data.entries, VARIANT_CONFIGS[variant])
  }

  return renderInfoboxHtml(data)
}

function sortVariantEntries(entries: InfoboxEntry[], config: InfoboxConfig): InfoboxEntry[] {
  const { fieldOrder = [], labelMap = {} } = config
  const images = entries.filter((entry) => entry.type === 'image')
  const textEntries = entries.filter((entry): entry is InfoboxTextEntry => entry.type === 'text')
  const paramKeys = new Set(textEntries.map((entry) => entry.label.toLowerCase()))

  const orderedLabels = [
    ...fieldOrder.filter((field) => paramKeys.has(field.toLowerCase())),
    ...textEntries
      .map((entry) => entry.label)
      .filter((label) => !fieldOrder.includes(label.toLowerCase()))
  ]

  const textByLabel = new Map(textEntries.map((entry) => [entry.label, entry]))
  const orderedText = orderedLabels
    .map((label) => textByLabel.get(label))
    .filter((entry): entry is InfoboxTextEntry => !!entry)
    .map((entry) => ({
      ...entry,
      label: labelMap[entry.label.toLowerCase()] ?? entry.label
    }))

  return [...images, ...orderedText]
}
