import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad_col2 = '        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}\n        <div className="@4xl:col-span-2 flex flex-col gap-6">'
good_col2 = '''        {/* Add Slot Sidebar (Desktop only) */}
        {isDesktop && (isAddSlotModalOpen || isAuxiliaryModalOpen) && (
          <div className="hidden lg:flex w-[350px] xl:w-[400px] shrink-0 space-y-3 lg:sticky lg:top-4 self-start h-[calc(100dvh-2rem)] flex-col bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-40">
             <AddSlotModal
               isOpen={true}
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
                 setPendingRearrangementPlan({ plan, item });
               }}
               isAuxiliaryMode={isAuxiliaryModalOpen}
               mode="desktop-sidebar"
               onHoverProductItem={(uSize) => setPreviewAddSlotSpanU(uSize || 1)}
             />
          </div>
        )}

        {/* Column 2 & 3: Selected Optionals & Catalog (Left side) */}
        <div className="w-full flex-1 flex flex-col gap-6 min-w-0">'''

text = text.replace(bad_col2, good_col2)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
