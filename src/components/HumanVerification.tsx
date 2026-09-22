import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Fingerprint, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HumanVerification = ({ onVerified }: { onVerified: () => void }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const startPress = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isVerified) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore browser support edge cases
    }

    setIsPressing(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsVerified(true);
          setIsPressing(false);
          // Wait 1.2 seconds for success animations to display and then verify
          setTimeout(() => onVerified(), 1400);
          return 100;
        }
        return prev + 2.5; // Takes about 800ms total for perfect pacing
      });
    }, 20);
  };

  const endPress = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
    setIsPressing(false);
    if (!isVerified) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Fast decrease instead of sudden drop for smoother feel
      intervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return Math.max(0, prev - 8);
        });
      }, 16);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Helper to get raw scanner status message text based on progress
  const getScannerStatus = () => {
    if (isVerified) return 'אימות סייבר ביומטרי עבר בהצלחה!';
    if (progress === 0) return 'אנא החזק את כפתור הסריקה הביומטרי';
    if (progress < 25) return 'מזהה מגע אורגני...';
    if (progress < 55) return 'בודק תנודות מיקרו-שריר אנושיות...';
    if (progress < 85) return 'מאמת דפוסי הולכה חשמלית של העור...';
    return 'סורק מרכיבים ביולוגיים... כמעט סיימנו!';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d1627]/75 backdrop-blur-md p-4">
      {/* Background ambient visual grids and lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#004387]/10 rounded-full blur-[140px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="bg-white/95 shadow-[0_25px_60px_rgba(0,0,0,0.4)] backdrop-blur-lg border border-gray-100 rounded-3xl p-6 sm:p-10 max-w-md w-full text-center flex flex-col items-center select-none relative overflow-hidden" dir="rtl"
      >
        {/* Glow progress bar matching general colors on top of card */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-[#004387] shadow-[0_2px_10px_rgba(37,99,235,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Security / Verification Badge */}
        <div className="mb-6 relative">
          <AnimatePresence mode="wait">
            {isVerified ? (
              <motion.div
                key="verified-badge"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <ShieldCheck size={44} className="animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key="unverified-badge"
                initial={{ scale: 0.9 }}
                animate={isPressing ? { scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] } : { scale: 1 }}
                transition={{ duration: 0.8, repeat: isPressing ? Infinity : 0 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md transition-colors ${
                  isPressing 
                    ? 'bg-blue-50 text-[#004387] border-2 border-blue-200' 
                    : 'bg-[#004387]/5 text-[#004387] border border-gray-150'
                }`}
              >
                <Lock size={36} className={`${isPressing ? 'scale-110 text-blue-600' : 'text-[#004387]'}`} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Sparkle decorative icons */}
          {isPressing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-1 -right-3 text-amber-500"
            >
              <Sparkles size={20} />
            </motion.div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c2d57] mb-2 tracking-tight">
          {isVerified ? 'אימות הושלם בהצלחה!' : 'מנגנון אבטחה ביומטרי'}
        </h2>
        
        <p className="text-gray-500 text-sm sm:text-base max-w-xs mx-auto mb-8 font-medium leading-relaxed">
          {isVerified ? 'מזהה אנושי מורשה אושר. מעביר אותך לקטלוג...' : 'הוכח שאינך רובוט על־ידי לחיצה רציפה על כפתור הסריקה המאובטח'}
        </p>

        {/* Dynamic Scan Area Visualiser */}
        <div className="w-full max-w-xs mb-8 p-5 bg-gray-50/80 rounded-2xl border border-gray-200/60 relative">
          {/* High-end biometric ring scanning visual representation */}
          <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-4">
            
            {/* Ambient background shadow pulse */}
            <AnimatePresence>
              {isPressing && (
                <>
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-[#004387]/15 border border-[#004387]/30"
                  />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0.7 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut", delay: 0.4 }}
                    className="absolute inset-0 rounded-full bg-blue-500/10 border border-blue-500/20"
                  />
                </>
              )}
            </AnimatePresence>

            {/* Circular Progress Gauge using SVG for stunning professional look */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background ring track */}
              <circle 
                cx="50" 
                cy="50" 
                r="44" 
                className="stroke-gray-100 fill-none" 
                strokeWidth="6" 
              />
              {/* Animated active path ring */}
              <motion.circle 
                cx="50" 
                cy="50" 
                r="44" 
                className={`fill-none transition-colors duration-150 ${isVerified ? 'stroke-emerald-500' : 'stroke-[#004387]'}`}
                strokeWidth="6" 
                strokeDasharray="276"
                strokeDashoffset={276 - (276 * progress) / 100}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner Glowing Scanning Pad Button */}
            <button 
              className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center touch-none outline-none transition-all duration-300 pointer-events-auto cursor-pointer shadow-inner border-0 select-none ${
                isVerified 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                  : isPressing 
                    ? 'bg-[#004387] text-white shadow-[#004387]/30 scale-95' 
                    : 'bg-white text-[#004387] border border-gray-200 shadow-sm hover:border-gray-300'
              }`}
              onPointerDown={startPress}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Vertical scanning laser line animation */}
              {isPressing && !isVerified && (
                <motion.div 
                  initial={{ y: -45 }}
                  animate={{ y: 45 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.4, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-1 bg-cyan-400 opacity-80 shadow-[0_0_10px_#22d3ee] z-20"
                />
              )}

              <Fingerprint size={42} className={`${isPressing && !isVerified ? 'animate-pulse text-cyan-200' : ''}`} />
              
              <span className="text-[10px] mt-1.5 font-bold uppercase tracking-wider opacity-90 block">
                {isVerified ? 'מאומת' : isPressing ? 'סורק...' : 'החזק כאן'}
              </span>
            </button>
          </div>

          {/* Micro-interaction status readout */}
          <div className="text-center h-12 flex flex-col justify-center items-center">
            <div className={`text-xs font-bold transition-colors ${isPressing ? 'text-[#004387]' : 'text-gray-400'}`}>
              {getScannerStatus()}
            </div>
            
            {progress > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm font-mono font-extrabold text-[#004387] mt-0.5"
              >
                {Math.round(progress)}%
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer info lock secure banner */}
        <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 pt-4 w-full justify-center">
          <AlertCircle size={14} className="text-[#004387]/60" />
          <span>מערכת אבטחה ביומטרית מורשה B2B Secure Gate</span>
        </div>
      </motion.div>
    </div>
  );
};
