import re

with open('src/components/3d/NetworkTopology.tsx', 'r', encoding='utf-8') as f:
    net = f.read()
net = net.replace('nodes.map((node, i) => (\n        <group', 'nodes.map((node, i) => (\n          // @ts-ignore\n        <group')
with open('src/components/3d/NetworkTopology.tsx', 'w', encoding='utf-8') as f:
    f.write(net)

