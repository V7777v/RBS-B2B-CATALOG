with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    lines = f.readlines()

with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.writelines(lines[:198] + lines[234:])
