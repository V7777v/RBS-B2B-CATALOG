with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[180:240]):
    print(f"{181+i}: {line.rstrip()}")
