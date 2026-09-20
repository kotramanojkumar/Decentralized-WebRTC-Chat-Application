import re

with open('src/pages/RoomPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove imports
code = re.sub(r'import \{ aiService \} from \'../ai/AIService\';\n', '', code)

# 2. Remove contexts
code = re.sub(r'\s*aiService.setContext\(.*?\);\n', '\n', code)

# 3. Remove state variables
code = re.sub(r'^\s*const \[aiSummary, setAiSummary\].*\n', '', code, flags=re.MULTILINE)
code = re.sub(r'^\s*const \[isSummarizing, setIsSummarizing\].*\n', '', code, flags=re.MULTILINE)
code = re.sub(r'^\s*const \[showAiMenu, setShowAiMenu\].*\n', '', code, flags=re.MULTILINE)

# 4. Remove summarize handlers completely
code = re.sub(r'\s*const handleSummarize = async \(\) => \{.*?(?=\s*const handleExtractActions =)', '', code, flags=re.DOTALL)
code = re.sub(r'\s*const handleExtractActions = async \(\) => \{.*?(?=\s*// WebSocket connection &)', '', code, flags=re.DOTALL)

# 5. Remove UI components
# Remove AI summary box
code = re.sub(r'\s*\{aiSummary && \([\s\S]*?</div>\s*\)\}', '', code)

# Remove AI dropdown menu
code = re.sub(r'\s*\{showAiMenu && \([\s\S]*?</div>\s*\)\}', '', code)

# Remove AI button (Find the exact button starting with <button ... setShowAiMenu)
code = re.sub(r'\s*<div className="relative">\s*<button type="button" onClick=\{\(\) => setShowAiMenu[^\n]+.*?Local AI.*?</button>\s*</div>', '', code, flags=re.DOTALL)

with open('src/pages/RoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
