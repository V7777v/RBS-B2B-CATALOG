import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad_grid = '      <div className="p-6 grid grid-cols-1 @4xl:grid-cols-3 gap-8">\n        \n        {/* Column 1: Interactive Server Rack Simulator (Right side) */}\n        <div className="@4xl:col-span-1 space-y-3 lg:sticky lg:top-4 self-start max-h-[calc(100vh-2rem)] flex flex-col">'
good_grid = '''      <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        
        {/* Column 1: Interactive Server Rack Simulator (Right side) */}
        <div className={`w-full ${(isAddSlotModalOpen || isAuxiliaryModalOpen) && isDesktop ? 'lg:w-[35%] xl:w-[40%]' : 'lg:w-[35%] xl:w-[33%]'} shrink-0 space-y-3 lg:sticky lg:top-4 self-start max-h-[calc(100dvh-2rem)] flex flex-col transition-all duration-300`}>'''

text = text.replace(bad_grid, good_grid)

bad_col2 = '        {/* Column 2: Order & Accessories */}\n        <div className="@4xl:col-span-2 space-y-6">'
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

        {/* Column 2: Order & Accessories */}
        <div className="w-full flex-1 space-y-6 min-w-0">'''

text = text.replace(bad_col2, good_col2)

with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
