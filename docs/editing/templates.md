# Templates

Templates are reusable blocks you drop into articles — infoboxes, image galleries, callouts, and your own custom layouts.

## Built-in templates

### Infobox

A summary box that floats to the right of the article text:

```markdown
{{Infobox|title=Ada Lovelace|Born=1815|Died=1852|Known for=Computing}}
```

Click **Infobox** in the editor toolbar to open the visual editor. Pick **Basic**, **Person**, or **Country** for preset fields. You can upload an image and drag rows to reorder them.

### Image box

A gallery with captions:

```markdown
{{ImageBox|@img0=photo.jpg|@img0_cap=Front view|columns=2}}
```

Use the **ImageBox** toolbar button. Upload images per slot, set captions and column count, and drag to reorder images.

### Callouts

```markdown
{{Note|Helpful context for the reader.}}
{{Warning|Something to watch out for.}}
```

### Stub banner

```markdown
{{Stub}}
```

Marks the article as incomplete.

## Custom templates

Make a page in the **template** namespace, then call it from any article:

```markdown
{{Character|name=Alice|role=Editor}}
```

Template body example (namespace: `template`, title: `Character`):

```markdown
**Name:** {{{name}}}
**Role:** {{{role}}}
```

Placeholders use `{{{param_name}}}`.

Manage them under **Admin → Templates** or at `/pages?ns=template`.

## Family tree embed

```markdown
{{FamilyTree|family=my-family-slug}}
```

See [Family trees](../family-trees.md).

## Toolbar shortcuts

The editor toolbar inserts the right syntax for Note, Warning, Infobox, ImageBox, and Family Tree at your cursor.
