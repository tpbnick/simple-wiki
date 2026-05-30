import { Bold, Italic, Link2, Hash, Code2, Info, AlertTriangle } from 'lucide-svelte'

export type ToolbarAction = {
  icon:
    | typeof Bold
    | typeof Italic
    | typeof Link2
    | typeof Hash
    | typeof Code2
    | typeof Info
    | typeof AlertTriangle
  label: string
  action: () => void
}

export function createMarkdownToolbarActions(handlers: {
  wrap: (before: string, after?: string, placeholder?: string) => void
  insertAt: (text: string) => void
}): ToolbarAction[] {
  return [
    { icon: Bold, label: 'Bold', action: () => handlers.wrap('**') },
    { icon: Italic, label: 'Italic', action: () => handlers.wrap('*') },
    { icon: Link2, label: 'Wiki link', action: () => handlers.wrap('[[', ']]', 'Page Name') },
    { icon: Hash, label: 'Heading', action: () => handlers.insertAt('\n## ') },
    { icon: Code2, label: 'Code', action: () => handlers.wrap('`') },
    { icon: Info, label: 'Note', action: () => handlers.insertAt('\n{{Note|Your note here}}\n') },
    {
      icon: AlertTriangle,
      label: 'Warning',
      action: () => handlers.insertAt('\n{{Warning|Your warning here}}\n')
    }
  ] as ToolbarAction[]
}
