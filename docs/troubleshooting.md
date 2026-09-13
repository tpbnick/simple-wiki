# Troubleshooting

## Cannot sign in

| Problem                        | What to try                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Forgot admin password          | In Docker: `docker exec <container> node scripts/reset-password.mjs admin` (prints a new temp password). Locally: `bun run reset-password -- admin`. Or check first-boot server logs |
| "Invalid username or password" | Check caps lock. Usernames are case-sensitive                                                                                                                                        |
| Redirected to change password  | Normal on first login — set a new password at `/admin/change-password`                                                                                                               |
| "Too many login attempts"      | Wait about 15 minutes, then try again                                                                                                                                                |
| Page requires login to read    | Public read may be off — sign in, or ask your host to enable `PUBLIC_READ`                                                                                                           |

## Page won't save

| Problem             | What to try                                                      |
| ------------------- | ---------------------------------------------------------------- |
| Edit conflict       | Use **Reload latest** or **Overwrite with mine** on the banner   |
| Content too large   | Page markdown is limited to 2 MB per save (uploads don't count)  |
| Not signed in       | Sign in first                                                    |
| "Too many requests" | You hit a rate limit — wait a minute and retry                   |
| Duplicate page      | A page at that address already exists — open it and edit instead |

## Broken images or links

| Problem             | What to try                                                        |
| ------------------- | ------------------------------------------------------------------ |
| Broken image        | Check **Admin → Files** — the upload may have been deleted         |
| Red wiki link       | The target page doesn't exist yet — click to create it (signed in) |
| Can't delete a file | A page still references it — remove the reference first            |

## Search returns nothing

- Type at least three characters for header suggestions
- Search covers articles and help pages — try simpler, plain-text words

## History and diffs

| Problem                     | What to try                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------- |
| "Diff too large to display" | The change is saved; the diff is just too big to show inline. You can still restore |
| Can't restore               | You must be signed in. Refresh the history page if the restore button fails         |

## Family tree issues

| Problem           | What to try                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Embed is empty    | Check **Admin → Extensions** — Family Tree must be enabled. Verify the `family=` slug matches a real tree |
| Changes not saved | Click **Save** in the tree editor. Don't leave with unsaved changes                                       |
| Edit conflict     | Use **Reload latest** or **Overwrite with mine** — same choices as wiki page conflicts                    |

## Backup import

| Problem           | What to try                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Import fails      | Use a valid Simple-Wiki backup zip. Check **Fully overwrite existing database**            |
| 413 / too large   | Increase `BODY_SIZE_LIMIT` (defaults to `512M` with `bun run start` / Docker) and restart  |
| 503 during import | Normal — the database is swapping. Wait a few seconds and refresh                          |
| Missing uploads   | Enable **Restore uploads** during import. Files on disk that aren't in the backup are kept |

## Browser issues

| Problem               | What to try                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Blank or stuck page   | Hard refresh (++Cmd+Shift+R++ on Mac, ++Ctrl+Shift+R++ on Windows). Try disabling browser extensions on localhost |
| Reading settings lost | They're stored per browser — they don't sync                                                                      |
| Theme resets          | Make sure cookies are enabled                                                                                     |

## Still stuck?

- Read the built-in help at `/wiki/help` on your wiki
- See the [project README](https://github.com/tpbnick/simple-wiki) for installation and hosting
- [Open an issue](https://github.com/tpbnick/simple-wiki/issues) on GitHub
