
import os
from collections import Counter

image_dir = 'app/static/product_images'
all_files = []

for root, dirs, files in os.walk(image_dir):
    for file in files:
        if file.endswith(('.webp', '.jpg', '.png')):
            all_files.append(file)

counts = Counter(all_files)
duplicates = {file: count for file, count in counts.items() if count > 1}

if duplicates:
    print(f"Found {len(duplicates)} duplicate filenames:")
    for file, count in duplicates.items():
        print(f"  {file}: {count} occurrences")
else:
    print("No duplicate filenames found across subdirectories.")
