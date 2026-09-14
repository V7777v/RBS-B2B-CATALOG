import re

with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad_alloc = """        // 1. If item has a specific targetU, ONLY allocate at targetU (do not move without user action)
        if (opt.targetU && q === 0) {
          const prefStart = opt.targetU - 1; // 0-based
          if (prefStart >= 0 && prefStart + size <= totalSlotsU) {
            let fits = true;
            for (let j = 0; j < size; j++) {
              if (visualSlotsAlloc[prefStart + j] !== null) {
                fits = false;
                break;
              }
            }
            if (fits) {
              foundStart = prefStart;
            }
          }
        } else if (!opt.targetU) {"""

good_alloc = """        // 1. If item has a specific targetU, ONLY allocate at targetU (do not move without user action)
        if (opt.targetU && q === 0) {
          const prefStart = opt.targetU - 1; // 0-based
          if (prefStart >= 0 && prefStart + size <= totalSlotsU) {
            let fits = true;
            for (let j = 0; j < size; j++) {
              if (visualSlotsAlloc[prefStart + j] !== null) {
                fits = false;
                break;
              }
            }
            if (fits) {
              foundStart = prefStart;
            }
          }
        } else {"""

text = text.replace(bad_alloc, good_alloc)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
