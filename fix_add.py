import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """    const newInstId = `${acc.sku || acc.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setSelectedOptionals(prev => [...prev, { ...acc, quantity: 1, id: newInstId, instanceId: newInstId, targetU: undefined }]);
    setLastAddedInstanceId(newInstId);"""

good = """    // Validate space BEFORE adding!
    const analysis = analyzeCabinetSpace(totalU, slots);
    const placement = classifyItemPlacement(acc, analysis, null, slots);
    
    if (placement.category === 'infeasible') {
      setPendingAccessory(acc);
      setWarningModalOpen(true);
      return;
    }

    if (placement.category === 'rearrange' && placement.rearrangementPlan) {
      // Must rearrange to fit. Show the proposal instead of adding directly.
      const currentSignature = JSON.stringify(selectedOptionals.map(o => o.id));
      setPendingRearrangementPlan({ plan: placement.rearrangementPlan, item: acc, stateSignature: currentSignature });
      return;
    }

    // Direct or alternative (we can just add it, and the engine will place it in alternative automatically)
    // Wait, if it has targetU from the list? From list it has no targetU, so it's placed top-down.
    const newInstId = `${acc.sku || acc.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setSelectedOptionals(prev => [...prev, { ...acc, quantity: 1, id: newInstId, instanceId: newInstId, targetU: undefined }]);
    setLastAddedInstanceId(newInstId);
    setUndoState(null);"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
