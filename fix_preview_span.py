import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    "const [addSlotTargetU, setAddSlotTargetU] = useState<number | null>(null);",
    "const [addSlotTargetU, setAddSlotTargetU] = useState<number | null>(null);\n  const [previewAddSlotSpanU, setPreviewAddSlotSpanU] = useState<number>(1);"
)

text = text.replace(
    "previewSpanU={1}",
    "previewSpanU={previewAddSlotSpanU}"
)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
