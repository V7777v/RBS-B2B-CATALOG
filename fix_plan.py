import re
with open('src/components/CabinetConfigurator.tsx') as f:
    text = f.read()

bad = """  const [pendingRearrangementPlan, setPendingRearrangementPlan] = useState<{ plan: RearrangementPlan; item: any } | null>(null);"""
good = """  const [pendingRearrangementPlan, setPendingRearrangementPlan] = useState<{ plan: RearrangementPlan; item: any; stateSignature?: string } | null>(null);"""
text = text.replace(bad, good)

bad2 = """  const handleConfirmRearrangement = () => {
    if (!pendingRearrangementPlan) return;
    const { plan, item } = pendingRearrangementPlan;"""
good2 = """  const handleConfirmRearrangement = () => {
    if (!pendingRearrangementPlan) return;
    const { plan, item, stateSignature } = pendingRearrangementPlan;
    
    // Validate state hasn't changed since proposal
    const currentSignature = JSON.stringify(selectedOptionals.map(o => o.id));
    if (stateSignature && stateSignature !== currentSignature) {
      alert("מצב הארון השתנה מאז חישוב ההצעה. אנא נסה שוב.");
      setPendingRearrangementPlan(null);
      return;
    }"""
text = text.replace(bad2, good2)

bad3 = """      setPendingRearrangementPlan({ plan: placement.rearrangementPlan, item: acc });"""
good3 = """      const currentSignature = JSON.stringify(selectedOptionals.map(o => o.id));
      setPendingRearrangementPlan({ plan: placement.rearrangementPlan, item: acc, stateSignature: currentSignature });"""
text = text.replace(bad3, good3)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
