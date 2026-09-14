import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad = '''      {/* Inspected Product Float Popup */}
      <AnimatePresence>
        {inspectedProduct && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[calc(100vw-2rem)] sm:max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            dir="rtl"
          >'''

good = '''      {/* Inspected Product Panel (Mobile: Bottom Float, Desktop: Inline) */}
      <AnimatePresence>
        {inspectedProduct && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed lg:hidden bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[calc(100vw-2rem)] sm:max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            dir="rtl"
          >'''

text = text.replace(bad, good)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
