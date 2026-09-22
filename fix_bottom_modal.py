import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = '''      {/* 3D & 2D Interactive Add Slot / Auxiliary Modal */}
      <AddSlotModal
        isOpen={isAddSlotModalOpen || isAuxiliaryModalOpen}
        onClose={() => {
          setIsAddSlotModalOpen(false);
          setIsAuxiliaryModalOpen(false);
          setAddSlotTargetU(null);
        }}
        targetU={addSlotTargetU}
        totalU={totalSlotsU}
        slots={slots}
        availableU={availableU}
        compatibleAccessories={compatibleAccessories}
        onAddAccessoryAtSlot={handleAddOptionalAtSlot}
        onRequestRearrangement={(plan, item) => {
          setIsAddSlotModalOpen(false);
          setIsAuxiliaryModalOpen(false);
          setAddSlotTargetU(null);
          setPendingRearrangementPlan({ plan, item });
        }}
        isAuxiliaryMode={isAuxiliaryModalOpen}
      />'''

good = '''      {/* Mobile Drawer (Add Slot / Auxiliary) */}
      {!isDesktop && (
        <AddSlotModal
          isOpen={isAddSlotModalOpen || isAuxiliaryModalOpen}
          onClose={() => {
            setIsAddSlotModalOpen(false);
            setIsAuxiliaryModalOpen(false);
            setAddSlotTargetU(null);
            setPreviewAddSlotSpanU(1);
          }}
          targetU={addSlotTargetU}
          totalU={totalSlotsU}
          slots={slots}
          availableU={availableU}
          compatibleAccessories={compatibleAccessories}
          onAddAccessoryAtSlot={handleAddOptionalAtSlot}
          onRequestRearrangement={(plan, item) => {
            setIsAddSlotModalOpen(false);
            setIsAuxiliaryModalOpen(false);
            setAddSlotTargetU(null);
            setPreviewAddSlotSpanU(1);
            setPendingRearrangementPlan({ plan, item });
          }}
          isAuxiliaryMode={isAuxiliaryModalOpen}
          mode="mobile-drawer"
          onHoverProductItem={(uSize) => setPreviewAddSlotSpanU(uSize || 1)}
        />
      )}'''

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
