import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

def insert_clear_undo(func_name, code):
    return code.replace(f'const {func_name} = (', f'const {func_name} = (')

# actually simpler, let's just do:
text = text.replace('setLastAddedInstanceId(newInstId);', 'setLastAddedInstanceId(newInstId);\n    setUndoState(null);')
text = text.replace('setLastAddedInstanceId(newInstId2);', 'setLastAddedInstanceId(newInstId2);\n    setUndoState(null);')
text = text.replace('if (!item) return;', 'if (!item) return;\n    setUndoState(null);')

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
