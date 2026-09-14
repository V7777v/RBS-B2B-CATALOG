import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """    const newInstId2 = `${item.sku || item.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setLastAddedInstanceId(newInstId2);
    setUndoState(null);
    setHighlightedOptIdx(index);
    setChassisPulse(true);

    setSelectedOptionals(prev => [...prev, { ...item, quantity: 1, id: newInstId2, instanceId: newInstId2, targetU: undefined }]);"""

good = """    // Validate space BEFORE adding!
    const analysis = analyzeCabinetSpace(totalU, slots);
    const placement = classifyItemPlacement(item, analysis, null, slots);
    
    if (placement.category === 'infeasible') {
      setPendingAccessory(item);
      setWarningModalOpen(true);
      return;
    }

    if (placement.category === 'rearrange' && placement.rearrangementPlan) {
      // Must rearrange to fit. Show the proposal instead of adding directly.
      const currentSignature = JSON.stringify(selectedOptionals.map(o => o.id));
      setPendingRearrangementPlan({ plan: placement.rearrangementPlan, item, stateSignature: currentSignature });
      return;
    }

    const newInstId2 = `${item.sku || item.pn}-unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setLastAddedInstanceId(newInstId2);
    setUndoState(null);
    setHighlightedOptIdx(index);
    setChassisPulse(true);

    setSelectedOptionals(prev => [...prev, { ...item, quantity: 1, id: newInstId2, instanceId: newInstId2, targetU: undefined }]);"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
