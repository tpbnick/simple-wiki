import {
  getPage,
  savePage,
  PageConflictError,
  VALID_NAMESPACES,
  type Page
} from '$lib/db/index.js'
import { slugify } from '$lib/slug.js'

export type PageSaveFields = {
  title: string
  content: string
  namespace: string
  summary: string
  expectedUpdatedAt: string | null
}

export type PersistWikiPageResult =
  | { ok: true; slug: string; page: Page }
  | { ok: false; type: 'validation'; status: 400 | 422; message: string }
  | {
      ok: false
      type: 'duplicate'
      slug: string
      message: string
      fields: PageSaveFields
    }
  | {
      ok: false
      type: 'conflict'
      message: string
      fields: PageSaveFields
      expectedUpdatedAt: string | null
    }

/** Validates shared page save fields used by form and API handlers. */
export function validatePageSaveFields(
  fields: PageSaveFields
): { status: 400 | 422; message: string } | null {
  if (!fields.title.trim()) {
    return { status: 422, message: 'Title is required' }
  }

  if (typeof fields.content !== 'string') {
    return { status: 400, message: 'content is required' }
  }

  if (!VALID_NAMESPACES.has(fields.namespace)) {
    return {
      status: 422,
      message: `namespace must be one of: ${[...VALID_NAMESPACES].join(', ')}`
    }
  }

  return null
}

/**
 * Creates or updates a wiki page from form or API input.
 * Resolves slug generation for new pages when `routeSlug` is `new`.
 */
export function persistWikiPage(options: {
  routeSlug: string
  fields: PageSaveFields
  requireExpectedUpdatedWhenExisting?: boolean
}): PersistWikiPageResult {
  const validationError = validatePageSaveFields(options.fields)
  if (validationError) {
    return {
      ok: false,
      type: 'validation',
      status: validationError.status,
      message: validationError.message
    }
  }

  const slug =
    options.routeSlug === 'new' ? slugify(options.fields.title) : options.routeSlug

  if (!slug) {
    return {
      ok: false,
      type: 'validation',
      status: 422,
      message: 'Could not generate a valid slug from the title'
    }
  }

  if (options.routeSlug === 'new') {
    const existing = getPage(slug)
    if (existing) {
      return {
        ok: false,
        type: 'duplicate',
        slug,
        message: `A page already exists at /wiki/${slug}. Edit it instead.`,
        fields: options.fields
      }
    }
  }

  const existing = getPage(slug)
  if (existing && options.requireExpectedUpdatedWhenExisting && !options.fields.expectedUpdatedAt) {
    return {
      ok: false,
      type: 'validation',
      status: 400,
      message: 'expectedUpdatedAt is required when updating an existing page'
    }
  }

  try {
    const page = savePage(
      slug,
      options.fields.title.trim(),
      options.fields.content,
      options.fields.namespace,
      options.fields.summary,
      options.fields.expectedUpdatedAt
    )
    return { ok: true, slug, page }
  } catch (error) {
    if (error instanceof PageConflictError) {
      const current = getPage(slug)
      return {
        ok: false,
        type: 'conflict',
        message: 'This page was modified elsewhere. Review the latest version and save again.',
        fields: options.fields,
        expectedUpdatedAt: current?.updated_at ?? null
      }
    }
    throw error
  }
}
