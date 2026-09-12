import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldModal = `const GuestNoticeModal = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 animate-fade-in"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >`;

const newModal = `const GuestNoticeModal = ({ onDismiss }: { onDismiss: () => void }) => {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 animate-fade-in"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      onClick={onDismiss}
    >
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-[560px] w-full text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>`;

content = content.replace(oldModal, newModal);
fs.writeFileSync('src/App.tsx', content);
