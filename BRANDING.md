# Cloud Ember logo

Created 2026-10-25 for Carlo's SJB Writer fork, using the built-in imagegen
tool and Carlo's supplied Cloud Ember open-book reference. The navy pages,
gold edges, and cream clouds distinguish this fork from the original SJB
scroll-and-quill icon.

## Assets

All new artwork lives in `app/static/branding/`:

- `cloud-ember-source.png`: untouched generated image, 1254 × 1254, transparent.
- `cloud-ember-logo.png`: centered 1024 × 1024 transparent master for reuse.
- `icon-512.png` and `icon-192.png`: About panel and app/help headers.
- `apple-touch-icon.png`: 180 × 180 home-screen icon.
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, and
  `favicon.ico`: browser icons; ICO contains all three sizes.

The original icons remain in their original locations. The app template and
eight help pages reference the new folder, giving the browser fresh icon URLs.
Historical help screenshots still show the interface as it was captured.

## Generation prompt

```text
Use case: logo-brand
Asset type: production app logo, square transparent PNG.
Primary request: Adapt the supplied open-book-and-clouds reference into a new, distinctive logo for Carlo's fork of a local writing app.
Input image 1 is the style and motif reference: navy blue book pages, warm golden-amber edges, luminous cream clouds.
Subject: one bold open book with three broad upward-curving page shapes, its central page rising like a rounded cloud; a clear central fold and two sweeping lower page lines. Keep the book/cloud concept immediately legible.
Style: polished illustrated emblem, substantially simpler than the reference, crisp smooth contours, broad areas of midnight navy, rich amber-gold rims, soft cream cloud forms contained within the pages. Restrained luminous shading, minimal texture.
Composition: centered, nearly square mark with generous width and height, fills about 88 percent of canvas, transparent outside the silhouette. Strong readable silhouette and thick details that survive reduction to a small app icon.
Color palette: midnight navy #102E4A, ember gold #E8A94F, pale warm cream #FFF0CD.
Constraints: a single finished logo only. No lettering, no initials, no wordmark, no quill, no border, no enclosing square tile, no mockup, no watermark, no drop shadow outside the mark. Real transparent background.
```

## Rebuild the sizes

ImageMagick handles only trimming transparent margins, centering, resizing,
and file-format conversion. Run from the repository root:

```sh
magick app/static/branding/cloud-ember-source.png -trim +repage \
  -resize 920x920 -gravity center -background none -extent 1024x1024 \
  app/static/branding/cloud-ember-logo.png

for size in 16 32 48 180 192 512; do
  case "$size" in
    16|32|48) out="app/static/branding/favicon-${size}x${size}.png" ;;
    180) out="app/static/branding/apple-touch-icon.png" ;;
    *) out="app/static/branding/icon-${size}.png" ;;
  esac
  magick app/static/branding/cloud-ember-logo.png -resize "${size}x${size}" "$out"
done

magick app/static/branding/favicon-16x16.png \
  app/static/branding/favicon-32x32.png \
  app/static/branding/favicon-48x48.png app/static/branding/favicon.ico
```

## Validation

- All 60 existing server tests passed.
- On a disposable app copy, Flask rendered the main page and served all eight
  help pages; every linked branding asset returned an image successfully.
- PNG dimensions, transparency, and the three ICO sizes were checked.
- The finished mark was visually inspected on cream and dark slate backgrounds.
