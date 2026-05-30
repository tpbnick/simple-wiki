import {
  collectLightboxImages,
  resolveSlideData,
  MIN_LOOP_SLIDES
} from '$lib/lightbox/wiki-lightbox.js'

type Cleanup = () => void

let activeLightbox: { close: () => void } | null = null
let photoSwipeModule: typeof import('photoswipe') | null = null

async function getPhotoSwipe() {
  if (!photoSwipeModule) {
    photoSwipeModule = await import('photoswipe')
  }
  return photoSwipeModule.default
}

async function openLightbox(images: HTMLImageElement[], startIndex: number) {
  activeLightbox?.close()

  const slides = await Promise.all(images.map(resolveSlideData))
  const shouldLoop = slides.length >= MIN_LOOP_SLIDES
  const safeIndex = Math.min(Math.max(startIndex, 0), slides.length - 1)
  const PhotoSwipe = await getPhotoSwipe()

  const lightbox = new PhotoSwipe({
    dataSource: slides,
    index: safeIndex,
    loop: shouldLoop,
    bgOpacity: 0.92,
    wheelToZoom: true,
    showHideAnimationType: 'zoom',
    zoom: true,
    close: true,
    counter: slides.length > 1,
    arrowKeys: true
  })

  activeLightbox = lightbox
  lightbox.on('close', () => {
    if (activeLightbox === lightbox) activeLightbox = null
  })
  lightbox.init()
}

function attachLightbox(root: HTMLElement): Cleanup {
  const cleanups: Cleanup[] = []
  const images = collectLightboxImages(root)

  for (const [index, img] of images.entries()) {
    img.classList.add('wiki-lightbox-image')

    if (!img.hasAttribute('tabindex')) {
      img.tabIndex = 0
    }

    if (!img.getAttribute('role')) {
      img.setAttribute('role', 'button')
    }

    if (!img.alt) {
      img.setAttribute('aria-label', `View image ${index + 1} of ${images.length}`)
    }

    const onActivate = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      void openLightbox(images, index)
    }

    img.addEventListener('click', onActivate)
    cleanups.push(() => img.removeEventListener('click', onActivate))

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      onActivate(event)
    }

    img.addEventListener('keydown', onKeydown)
    cleanups.push(() => img.removeEventListener('keydown', onKeydown))

    const anchor = img.closest('a')
    if (anchor) {
      anchor.addEventListener('click', onActivate)
      cleanups.push(() => anchor.removeEventListener('click', onActivate))
      anchor.classList.add('wiki-lightbox-link')
    }

    cleanups.push(() => {
      img.classList.remove('wiki-lightbox-image')
      img.removeAttribute('role')
      if (img.getAttribute('aria-label')?.startsWith('View image ')) {
        img.removeAttribute('aria-label')
      }
      anchor?.classList.remove('wiki-lightbox-link')
    })
  }

  return () => {
    for (const cleanup of cleanups) cleanup()
  }
}

/** Attach lightbox handlers to all images under a wiki article root. */
export function mountWikiLightbox(node: HTMLElement): Cleanup {
  return attachLightbox(node)
}

/** Closes any open wiki lightbox carousel. */
export function closeActiveWikiLightbox(): void {
  activeLightbox?.close()
}
