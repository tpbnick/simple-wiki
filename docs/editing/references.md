# References

Add footnote-style citations that appear as a **References** section at the bottom of the page.

## Inline (easiest)

Put the source right in the marker. Numbers are assigned in order of appearance:

```markdown
Einstein published special relativity in 1905.[^: [On the Electrodynamics of Moving Bodies](https://example.com)]
```

Click **Reference** in the editor toolbar to insert this.

## Paired markers

Put `[^]` in the text and matching `[^]:` lines at the bottom:

```markdown
First claim.[^] Second claim.[^]

[^]: First source
[^]: Second source
```

They're matched in order — you don't number them yourself.

## What sources can contain

- Plain text: `[^: Published in Nature, 2020]`
- A link: `[^: [Article title](https://example.com)]`
- A wiki link: `[^: [[Related Page]]]`

## On the rendered page

Citation numbers in the text jump to the References section. Clicking one briefly highlights the matching entry.

The References heading only appears when the page actually has citations.

## Tips

- One-off citations → inline `[^: ...]`
- Many sources → paired `[^]` / `[^]:` at the bottom
- Both styles can mix on the same page
