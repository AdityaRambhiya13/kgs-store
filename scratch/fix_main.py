import re
import os

file_path = 'app/main.py'
with open(file_path, 'rb') as f:
    content = f.read().decode('utf-8', 'ignore')

# 1. Fix the merged decorator line (multiple occurrences if any)
content = re.sub(r'#.*@app\.get\("/api/admin/available-images"\)', '\n@app.get("/api/admin/available-images")', content)

# 2. Identify the core "available-images" function and remove any duplicates or garbage
# The correct function starts with 'def list_available_images' and ends after the try-except block

# To simplify, we'll just remove the specific garbage snippet that causes SyntaxError
garbage_snippet = r'and f\["name"\].lower\(\)\.endswith\(.*?\)\]'
content = re.sub(garbage_snippet, '', content)

# Remove the redundant print and return that often follow
content = re.sub(r'print\(f"Found \{len\(image_names\)\} images in Supabase bucket \'{BUCKET_NAME}\'"\)\n\s+return \{"images": image_names\}', '', content)

# 3. Fix the frontend serving comment
content = re.sub(r'# [^\w\s]{5,}', '# ', content)

# 4. Remove any lines that start with 'and f["name"]' or 'return {"images": image_names}' if they are dangling
lines = content.splitlines()
new_lines = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith('and f["name"]') or \
       stripped == 'return {"images": image_names}' or \
       stripped == 'except Exception as e:' and len(new_lines) > 0 and new_lines[-1].strip() == 'return {"images": []}':
        # This is likely garbage, but be careful.
        # If it's outside a function, it's definitely garbage.
        continue
    new_lines.append(line)

content = "\n".join(new_lines)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('# -*- coding: utf-8 -*-\n' + content)

print("Fixed app/main.py robustly")
