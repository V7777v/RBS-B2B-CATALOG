import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """      // Check placement using placement engine
      const analysis = analyzeCabinetSpace(totalSlotsU, slots, null);
      const placementRes = classifyItemPlacement(acc, analysis, null, slots);

      if (placementRes.category === 'rearrange' && placementRes.rearrangementPlan) {
        setPendingRearrangementPlan({
          plan: placementRes.rearrangementPlan,
          item: acc,
        });
        return;
      }"""

good = """      // Check placement using placement engine
      const analysis = analyzeCabinetSpace(totalSlotsU, slots, null);
      const placementRes = classifyItemPlacement(acc, analysis, null, slots);

      if (placementRes.category === 'infeasible') {
        setPendingAccessory(acc);
        setWarningModalOpen(true);
        return;
      }

      if (placementRes.category === 'rearrange' && placementRes.rearrangementPlan) {
        const currentSignature = JSON.stringify(selectedOptionals.map(o => o.id));
        setPendingRearrangementPlan({
          plan: placementRes.rearrangementPlan,
          item: acc,
          stateSignature: currentSignature
        });
        return;
      }"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
