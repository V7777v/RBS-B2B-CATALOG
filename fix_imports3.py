import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

m = re.search(r"import \{([^}]+)\} from '\.\./utils/cabinetData';", text)
if m:
    imports = set([x.strip() for x in m.group(1).split(',') if x.strip()])
    imports.update(['isCabinetProduct'])
    new_import = "import { " + ", ".join(sorted(list(imports))) + " } from '../utils/cabinetData';"
    text = text[:m.start()] + new_import + text[m.end():]
    
    with open('src/components/CabinetConfigurator.tsx', 'w') as f:
        f.write(text)
