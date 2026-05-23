import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const HumanVerification = ({ onVerified }: { onVerified: () => void }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const startPress = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (isVerified) return;
    e.preventDefault();
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsVerified(true);
          setTimeout(() => onVerified(), 1000);
          return 100;
        }
        return prev + 2; // Takes about 1 second total
      });
    }, 20);
  };

  const endPress = () => {
    if (!isVerified) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center select-none" dir="rtl">
        {isVerified ? (
          <ShieldCheck size={64} className="text-green-500 mb-4 animate-bounce" />
        ) : (
          <ShieldAlert size={64} className="text-[#004387] mb-4" />
        )}
        
        <h2 className="text-2xl font-bold text-[#0c2d57] mb-2">
          {isVerified ? 'אימות הושלם!' : 'אימות אנושי'}
        </h2>
        <p className="text-gray-500 mb-8">
          {isVerified ? 'מיד תועבר לקטלוג...' : 'הוכח שאינך רובוט כדי להמשיך'}
        </p>

        {!isVerified ? (
          <button 
            className="relative w-full h-16 bg-gray-100 rounded-full border border-gray-200 overflow-hidden shadow-inner flex items-center justify-center select-none touch-none outline-none focus:ring-2 focus:ring-[#f7941d] active:scale-95 transition-transform"
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div 
              className="absolute top-0 bottom-0 right-0 bg-[#004387] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
            <span className={`relative z-10 font-bold transition-colors ${progress > 50 ? 'text-white' : 'text-[#0c2d57]'}`}>
              לחץ והחזק לאימות
            </span>
          </button>
        ) : (
          <div className="w-full h-16 bg-green-50 rounded-full border border-green-200 flex items-center justify-center text-green-700 font-semibold shadow-inner">
            <span className="animate-pulse">מכניס אותך למערכת...</span>
          </div>
        )}
      </div>
    </div>
  );
};

