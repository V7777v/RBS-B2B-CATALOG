import re
with open('src/utils/cabinetPlacementEngine.ts') as f:
    text = f.read()

bad = """          isLocked: isPreset,"""
good = """          // Only lock if it has explicit lock flag or if it's hardware that absolutely cannot be moved.
          // Included items (preset) are NOT strictly locked unless specified.
          isLocked: s.accessoryRef?.isLocked === true || s.type === 'preset-fan',"""

text = text.replace(bad, good)
with open('src/utils/cabinetPlacementEngine.ts', 'w') as f:
    f.write(text)
