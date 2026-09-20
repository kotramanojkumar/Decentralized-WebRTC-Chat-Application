const fs = require('fs');
let code = fs.readFileSync('src/pages/RoomPage.tsx', 'utf8');

// The AI Button
code = code.replace(/<button[\s\S]*?setShowAiMenu[\s\S]*?<\/button>/, '');

// The metrics warning from lines 167, 169
code = code.replace(/const unsubscribeNetwork = networkMonitorRef\.current\.subscribe\(\(metrics\) => \{[\s\S]*?\}\);/, 'const unsubscribeNetwork = networkMonitorRef.current.subscribe(() => {});');
code = code.replace(/const unsubscribeMedia = mediaMonitorRef\.current\.subscribe\(\(metrics\) => \{[\s\S]*?\}\);/, 'const unsubscribeMedia = mediaMonitorRef.current.subscribe(() => {});');


fs.writeFileSync('src/pages/RoomPage.tsx', code, 'utf8');
