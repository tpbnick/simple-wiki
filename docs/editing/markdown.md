# Markdown & wiki links

Simple-Wiki uses standard markdown plus [GitHub Flavored Markdown](https://github.github.com/gfm/) (tables, strikethrough, task lists).

## Basics

```markdown
# Heading 1
## Heading 2

**bold** and *italic*

- Bullet
- List

1. Numbered
2. List

[External link](https://example.com)

`inline code`
```

### Code blocks

````markdown
```python
def hello():
    print("Hello")
```
````

Add a language name after the opening backticks for syntax highlighting.

### Tables

```markdown
| Column | Value |
|--------|-------|
| Name   | Ada   |
```

### Task lists

```markdown
- [x] Done
- [ ] Todo
```

## Wiki links

Link to other pages on your wiki:

```markdown
[[Page Title]]
[[Page Title|custom label]]
```

- Existing pages → blue link
- Missing pages → **red link** (click to create, if signed in)
- Works in infoboxes, family tree names, and reference sources

## Headings and sidebar TOC

`#` through `####` become headings. Levels 1–4 show up in the article sidebar on long pages.

## Quick reference

| Syntax | Result |
|--------|--------|
| `[[Page Title]]` | Wiki link |
| `[[Title\|label]]` | Wiki link with custom text |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `` `code` `` | `code` |
| `~~strike~~` | ~~strike~~ |

For infoboxes, callouts, and galleries, see [Templates](templates.md).
