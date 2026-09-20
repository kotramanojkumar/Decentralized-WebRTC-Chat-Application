import re

with open('src/pages/RoomPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('fileTransferRef.current.onNetworkMetrics = (metrics) => {', 'fileTransferRef.current.onNetworkMetrics = () => {')
code = code.replace('fileTransferRef.current.onMediaMetrics = (metrics) => {', 'fileTransferRef.current.onMediaMetrics = () => {')

with open('src/pages/RoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
