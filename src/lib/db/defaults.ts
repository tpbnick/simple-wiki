/** Default markdown for the home page when it does not exist yet. */
export const HOME_CONTENT = `Welcome to your personal wiki! This page is editable — click **Edit** in the top-right corner to get started.

## Getting started

- Create a new page using the **New page** button in the header
- Link pages together with \`[[Page Title]]\` wiki links
- Add an infobox with \`{{Infobox|title=Name|Key=Value}}\`
- Upload images and files using the upload button in the editor toolbar
- Manage all pages and files from the [Admin dashboard](/admin)

## Markdown quick-reference

| Syntax | Result |
|--------|--------|
| \`[[Page Title]]\` | Wiki link to another page |
| \`[[Page Title\\|display text]]\` | Wiki link with custom label |
| \`{{Infobox\\|title=Name\\|Key=Value}}\` | Float-right infobox |
| \`{{Note\\|Your text here}}\` | Info callout |
| \`{{Warning\\|Your text here}}\` | Warning callout |
| \`{{Stub}}\` | Marks an article as a stub |
| \`[^: Source text]\` | Inline [1] reference with source attached |
| \`[^]\` with \`[^]: Source text\` at bottom | Numbered by order — no manual ids |

## References

Add numbered citations that link to a **References** section at the bottom of the page. Display numbers are assigned automatically from the order references appear in the text.

**Easiest:** put the source right in the marker (use the **Reference** toolbar button). Insert anywhere without renumbering:

\`\`\`
Einstein published special relativity in 1905.[^: [On the Electrodynamics of Moving Bodies](https://example.com)]
\`\`\`

**Alternative:** use a marker in the text and matching lines at the bottom, in the same order:

\`\`\`
First claim.[^] Second claim.[^]

[^]: First source
[^]: Second source
\`\`\`

Sources can be plain text, a markdown link like \`[label](url)\`, or a \`[[wiki link]]\`.

## Tips

Red links point to pages that don't exist yet — click one to create it.
`

/** Default markdown for the help page when it does not exist yet. */
export const HELP_CONTENT = `# Wiki help

## Reading

- Use the header search to find pages (suggestions appear after three characters)
- The sidebar table of contents appears on long article pages
- Red [[wiki links]] point to pages you can create

## Editing

Sign in, then use **Edit** on any page or **New page** in the header.

- \`[[Page Title]]\` — link to another page
- \`[[Title|label]]\` — link with custom text
- \`{{Infobox|title=Name|Key=Value}}\` — sidebar infobox
- \`{{Note|…}}\` / \`{{Warning|…}}\` — callout boxes
- \`[^: …]\` — inline reference with source attached (numbers assigned automatically)
- \`[^]\` in the text with \`[^]: …\` lines at the bottom — paired in order. Use the **Reference** toolbar button.

## Admin

Open **Admin** from the header to manage pages, uploads, templates, and extensions.

## Tips

Use **Settings** (gear icon) to change font, text size, and reading width. Theme toggle is next to it.
`
