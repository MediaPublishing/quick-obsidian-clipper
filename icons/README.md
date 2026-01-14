# Extension Icons

You need to add icon files in this directory before loading the extension.

## Required Icons

- `icon16.png` - 16x16px
- `icon32.png` - 32x32px
- `icon48.png` - 48x48px
- `icon128.png` - 128x128px

## Option 1: Use the generate_icons.py Script

If you have the browser-extension skill installed with the icon generator:

```bash
# Using a source image (512x512 recommended)
python3 ~/.claude/skills/browser-extension/scripts/generate_icons.py your-logo.png icons/
```

## Option 2: Create Icons Manually

Use any image editor to create 16x16, 32x32, 48x48, and 128x128 PNG versions of your icon.

**Design Guidelines:**
- Simple, recognizable design
- Works well at small sizes
- Transparent background (PNG with alpha)
- Square aspect ratio (1:1)

**Suggested Design:**
- Purple/violet background (#7c3aed)
- White "O" or clip symbol
- Minimalist, flat design

## Option 3: Use Obsidian's Logo (Temporary)

For testing, you can temporarily use Obsidian's logo or any placeholder icon, but replace it before publishing.

## Quick Generation with ImageMagick

If you have ImageMagick installed:

```bash
# Create a simple purple icon with "QC" text
convert -size 128x128 xc:"#7c3aed" \
  -font Arial -pointsize 64 -fill white \
  -gravity center -annotate +0+0 "QC" \
  icon128.png

# Generate other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

## Testing

After adding icons, reload the extension in Chrome to see them in action.
