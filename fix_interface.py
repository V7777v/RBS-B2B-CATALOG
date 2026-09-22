import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = """export interface EnrichedPreviewItem {
  name: string;
  sku?: string;"""

good = """export interface EnrichedPreviewItem {
  instanceId?: string;
  name: string;
  sku?: string;"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
