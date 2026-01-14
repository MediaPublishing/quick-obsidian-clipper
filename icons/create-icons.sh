#!/bin/bash
# Create simple colored PNG icons using ImageMagick or sips
for size in 16 32 48 128; do
  # Create a simple purple square icon using macOS sips
  # First create a larger base image, then resize
  python3 << PYTHON
from PIL import Image, ImageDraw, ImageFont
import os

size = $size
img = Image.new('RGB', (size, size), color='#7c3aed')
draw = ImageDraw.draw(img)

# Draw a simple "O" for Obsidian
if size >= 32:
    circle_padding = size // 4
    draw.ellipse([circle_padding, circle_padding, size-circle_padding, size-circle_padding], 
                 outline='white', width=max(2, size//16))

img.save(f'icon{size}.png')
print(f'Created icon{size}.png')
PYTHON
done
