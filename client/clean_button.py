import re

with open('src/pages/RoomPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the exact button block
code = re.sub(r'\s*<div className="relative">\s*<button\s*type="button"\s*onClick=\{\(\) => setShowAiMenu\(!showAiMenu\)\}[\s\S]*?</button>\s*</div>', '', code, flags=re.DOTALL)

with open('src/pages/RoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
