export interface FontOption {
  id: string
  label: string
  stack: string
}

export interface SizeOption {
  id: string
  label: string
  value: string
}

export const FONTS: FontOption[] = [
  {
    id: 'atkinson',
    label: 'Atkinson Hyperlegible',
    stack: "'Atkinson Hyperlegible', system-ui, sans-serif"
  },
  {
    id: 'georgia',
    label: 'Georgia',
    stack: "Georgia, 'Times New Roman', serif"
  },
  {
    id: 'roboto',
    label: 'Roboto',
    stack: "'Roboto', system-ui, sans-serif"
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    stack: "'Merriweather', Georgia, serif"
  },
  {
    id: 'space-mono',
    label: 'Space Mono',
    stack: "'Space Mono', ui-monospace, monospace"
  },
  {
    id: 'lato',
    label: 'Lato',
    stack: "'Lato', system-ui, sans-serif"
  }
]

export const SIZES: SizeOption[] = [
  { id: 'small', label: 'Small', value: '14px' },
  { id: 'medium', label: 'Medium', value: '16px' },
  { id: 'large', label: 'Large', value: '18px' }
]
