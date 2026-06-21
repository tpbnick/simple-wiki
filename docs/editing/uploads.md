# Uploads

Signed-in users can upload images and files.

## From the editor

**Upload button** — pick a file; the markdown link is inserted at your cursor:

- Images → `![filename](url)`
- Other files → `[filename](url)`

**Drag and drop** — drop a file onto the markdown pane. Same result.

**Infobox / ImageBox panels** — each has its own upload button per image slot.

Family tree person photos work the same way in the tree editor. See [Family trees](../family-trees.md).

## Using uploads in markdown

Files are served at `/uploads/[filename]`:

```markdown
![Diagram](/uploads/diagram.png)
[Download PDF](/uploads/report.pdf)
```

## Admin → Files

Admins can browse, preview, rename, and delete uploads. Renaming a file updates its links across the wiki automatically.

## Tips

- Descriptive filenames help — they show up in your markdown
