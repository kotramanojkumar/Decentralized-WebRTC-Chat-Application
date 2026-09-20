import re

with open('src/pages/RoomPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace metrics param with empty param since we removed the AI calls inside
code = re.sub(r'const unsubscribeNetwork = networkMonitorRef\.current\.subscribe\(\(metrics\) => \{', 'const unsubscribeNetwork = networkMonitorRef.current.subscribe(() => {', code)
code = re.sub(r'const unsubscribeMedia = mediaMonitorRef\.current\.subscribe\(\(metrics\) => \{', 'const unsubscribeMedia = mediaMonitorRef.current.subscribe(() => {', code)

with open('src/pages/RoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
