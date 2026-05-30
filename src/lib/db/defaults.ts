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

## Admin

Open **Admin** from the header to manage pages, uploads, templates, and extensions.

## Tips

Use **Settings** (gear icon) to change font, text size, and reading width. Theme toggle is next to it.
`
