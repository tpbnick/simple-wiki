# Family trees

<div class="screenshot" markdown>

![Family tree manager](assets/screenshots/family-tree.png)
*The family tree list at `/family-tree`.*

</div>

The Family Tree extension adds interactive genealogy trees you can embed in any article.

Anyone can **view** trees. Creating, editing, and deleting trees requires a signed-in account.

## Finding trees

Go to `/family-tree`, or **Admin → Extensions → Open** next to Family Tree.

| Action | Who |
|--------|-----|
| Browse and open trees | Everyone |
| **New tree** / **Delete** | Signed-in users |

## Tree editor

At `/family-tree/[slug]` you'll see a sidebar and a canvas.

### Sidebar — person details

Select a person to edit:

- **Name** — supports `[[wiki links]]` to biography pages
- **Birth year** / **Death year**
- **Photo** — upload an image

Drag the divider between sidebar and canvas to resize. Your preferred width is saved in the browser.

### Canvas — relationships

- **Add child**, **Add spouse**, **Add parent**
- **Link existing parent** — connect to someone already in the tree
- **Remove person**
- **Pan** — drag the canvas
- **Zoom** — scroll wheel
- **Recenter** — top-right button
- Click a person to highlight their paternal line

Click **Save** when you're done. The editor warns you if you try to leave with unsaved changes.

## Embedding in articles

```markdown
{{FamilyTree|family=smith-family}}
```

The slug matches the tree URL (`/family-tree/smith-family`).

From the page editor, use the **Family Tree** toolbar menu to insert an existing tree or create a new one inline.

In the rendered article:

- Readers can pan and zoom the embedded tree
- Signed-in editors see an **Edit tree** link on the embed

## Disabling the extension

**Admin → Extensions** → toggle Family Tree off. Routes return 404, embeds stop rendering, and the toolbar button disappears.

## Tips

- Link person names to wiki articles with `[[wiki links]]`
- Photos go to the same `/uploads/` folder as other wiki files
