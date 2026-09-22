import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """  const handleUndoLastAction = () => {
    if (!undoState) return;
    setSelectedOptionals(current => {
       return current.map(currOpt => {
           const oldOpt = undoState.selectedOptionals.find(o => 
             (currOpt.instanceId && o.instanceId === currOpt.instanceId) || 
             (currOpt.id && o.id === currOpt.id)
           );
           if (oldOpt) {
               return { ...currOpt, targetU: oldOpt.targetU };
           }
           return currOpt;
       });
    });
    setUndoState(null);
    setChassisPulse(true);
    setTimeout(() => setChassisPulse(false), 1400);
  };"""

good = """  const handleUndoLastAction = () => {
    if (!undoState) return;
    setSelectedOptionals(current => {
       // Restore the old state exactly, but preserve any newly added instances
       const restoredIds = new Set(undoState.selectedOptionals.map((o: any) => o.instanceId || o.id));
       const newerItems = current.filter(curr => !restoredIds.has(curr.instanceId || curr.id));
       return [...undoState.selectedOptionals, ...newerItems];
    });
    setUndoState(null);
    setChassisPulse(true);
    setTimeout(() => setChassisPulse(false), 1400);
  };"""

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
