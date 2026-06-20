import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import emailjs from '@emailjs/browser';
import { Lock, Mail, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck, MailCheck } from 'lucide-react';

// EmailJS — notify RBS when a new distributor registers (client-side, free tier)
const EMAILJS_SERVICE_ID = 'service_ml2hb5b';
const EMAILJS_TEMPLATE_ID = 'template_okd0fzw';
const EMAILJS_PUBLIC_KEY = 'k4hiP8DMsizj-JZLP';

const notifyAdmin = async (distributorEmail: string) => {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      { distributor_email: distributorEmail, registered_at: new Date().toLocaleString('he-IL') },
      { publicKey: EMAILJS_PUBLIC_KEY }
    );
  } catch { /* notification failure must not break registration */ }
};

const heError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email': return 'כתובת אימייל לא תקינה';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'אימייל או סיסמה שגויים';
    case 'auth/email-already-in-use': return 'האימייל הזה כבר רשום. נסה להתחבר.';
    case 'auth/weak-password': return 'הסיסמה חלשה מדי';
    case 'auth/too-many-requests': return 'יותר מדי ניסיונות. נסה שוב בעוד מספר דקות.';
    case 'auth/network-request-failed': return 'בעיית רשת. בדוק את החיבור ונסה שוב.';
    case 'auth/popup-closed-by-user': return 'חלון הכניסה נסגר. נסה שוב.';
    default: return 'אירעה שגיאה. נסה שוב.';
  }
};

// Reject non-Latin (e.g. Hebrew) characters and enforce a strong password.
const validatePassword = (pw: string): string => {
  if (/[^\u0000-\u007F]/.test(pw)) return 'הסיסמה חייבת להיות באנגלית בלבד (אסור עברית או תווים שאינם לטיניים)';
  if (pw.length < 8) return 'הסיסמה חייבת להכיל לפחות 8 תווים';
  if (!/[a-z]/.test(pw)) return 'הסיסמה חייבת לכלול אות קטנה (a-z)';
  if (!/[A-Z]/.test(pw)) return 'הסיסמה חייבת לכלול אות גדולה (A-Z)';
  if (!/[0-9]/.test(pw)) return 'הסיסמה חייבת לכלול ספרה (0-9)';
  return '';
};

// Checks the approved-distributors allowlist in Firestore.
const isApproved = async (email: string | null): Promise<boolean> => {
  if (!email) return false;
  try {
    const snap = await getDoc(doc(db, 'approvedDistributors', email.toLowerCase()));
    return snap.exists();
  } catch {
    return false;
  }
};

interface Props {
  setIsAuthenticated: (val: boolean) => void;
  onGuest?: () => void;
}

export const FirebaseAuthView: React.FC<Props> = ({ setIsAuthenticated, onGuest }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const resetMessages = () => { setError(''); setInfo(''); };

  // Block Hebrew/non-Latin characters from being typed into the password field at all.
  const onPasswordChange = (val: string) => {
    setPassword(val.replace(/[^\u0000-\u007F]/g, ''));
  };

  const handleRegister = async () => {
    resetMessages();
    if (!email) { setError('יש למלא כתובת אימייל'); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      await notifyAdmin(email.trim());
      await signOut(auth);
      setRegisteredEmail(email.trim());
      setRegistered(true);
      setAwaitingVerify(true);
      setPassword('');
    } catch (e: any) {
      setError(heError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    resetMessages();
    if (!email || !password) { setError('יש למלא אימייל וסיסמה'); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        setAwaitingVerify(true);
        await signOut(auth);
        setError('המייל שלך עדיין לא אומת. היכנס לתיבת הדואר (וגם ספאם) ולחץ על הקישור לאימות.');
        return;
      }
      if (!(await isApproved(cred.user.email))) {
        await signOut(auth);
        setInfo('המייל שלך אומת בהצלחה. החשבון ממתין כעת לאישור של RBS — תקבל גישה לאחר האישור.');
        return;
      }
      try { 
        localStorage.setItem('rbs_b2b_auth', 'true');
        localStorage.setItem('rbs_b2b_login_ts', Date.now().toString());
        sessionStorage.setItem('rbs_unlocked', '1');
      } catch {}
      setIsAuthenticated(true);
    } catch (e: any) {
      setError(heError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    resetMessages();
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (!(await isApproved(cred.user.email))) {
        await signOut(auth);
        setInfo('נכנסת עם Google בהצלחה. החשבון ממתין כעת לאישור של RBS — תקבל גישה לאחר האישור.');
        return;
      }
      try { 
        localStorage.setItem('rbs_b2b_auth', 'true');
        localStorage.setItem('rbs_b2b_login_ts', Date.now().toString());
        sessionStorage.setItem('rbs_unlocked', '1');
      } catch {}
      setIsAuthenticated(true);
    } catch (e: any) {
      setError(heError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    resetMessages();
    if (!email || !password) { setError('הזן אימייל וסיסמה כדי לשלוח שוב את מייל האימות'); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      setInfo('מייל אימות נשלח שוב. בדוק את תיבת הדואר.');
    } catch (e: any) {
      setError(heError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    resetMessages();
    if (!email) { setError('הזן את האימייל שלך כדי לאפס סיסמה'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('נשלח מייל לאיפוס סיסמה.');
    } catch (e: any) {
      setError(heError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  const submit = () => { if (mode === 'login') handleLogin(); else handleRegister(); };

  // After successful registration: clear "check your email" screen.
  if (registered) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0c2d57] to-[#004387] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#0c2d57] mb-3">בדוק את האימייל שלך</h1>
          <p className="text-sm text-gray-600 mb-2">שלחנו מייל אימות אל</p>
          <p className="text-sm font-bold text-[#004387] mb-4" dir="ltr">{registeredEmail}</p>
          <p className="text-sm text-gray-600 mb-2">היכנס לתיבת הדואר (בדוק גם בתיקיית ספאם) ולחץ על הקישור לאימות.</p>
          <p className="text-sm text-gray-600 mb-6">לאחר אימות המייל, החשבון שלך ימתין לאישור של RBS — תקבל גישה מלאה לאחר האישור.</p>
          {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-4">{info}</p>}
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>}
          <button
            type="button"
            onClick={() => { setRegistered(false); setMode('login'); resetMessages(); }}
            className="w-full py-3 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold rounded-lg transition"
          >חזרה למסך הכניסה</button>
          <p className="text-[11px] text-gray-400 mt-4">לא קיבלת מייל? במסך הכניסה תוכל ללחוץ על "שלח שוב מייל אימות".</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0c2d57] to-[#004387] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#004387] flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0c2d57]">אזור אישי למפיצים</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            {mode === 'login' ? 'התחבר עם האימייל והסיסמה שלך' : 'הרשמה למפיצים מורשים'}
          </p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); resetMessages(); }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-[#004387] shadow' : 'text-gray-500'}`}
          >כניסה</button>
          <button
            type="button"
            onClick={() => { setMode('register'); resetMessages(); }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === 'register' ? 'bg-white text-[#004387] shadow' : 'text-gray-500'}`}
          >הרשמה</button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.co.il"
              className="w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004387] focus:border-transparent outline-none text-right"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="סיסמה"
              className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004387] focus:border-transparent outline-none text-right"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {mode === 'register' && (
            <p className="text-[11px] text-gray-400 leading-relaxed">
              הסיסמה: לפחות 8 תווים, אות גדולה, אות קטנה וספרה. באנגלית בלבד.
            </p>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          {info && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{info}</span>
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full py-3 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'כניסה' : 'הרשמה')}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">או</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.6-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 16.3 2 9.7 6.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 46c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.5 36.4 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.6 41.6 16.2 46 24 46z"/>
              <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.9 36.1 46 30.6 46 24c0-1.5-.2-2.6-.4-3.5z"/>
            </svg>
            כניסה עם Google
          </button>

          {mode === 'login' && (
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <button type="button" onClick={handleForgotPassword} className="hover:text-[#004387]">שכחת סיסמה?</button>
              {awaitingVerify && (
                <button type="button" onClick={handleResendVerification} className="hover:text-[#004387]">שלח שוב מייל אימות</button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[12px] text-gray-500 leading-relaxed text-center mb-3">
            <strong className="text-[#0c2d57]">הרשמה מיועדת למפיצים מורשים בלבד</strong> — והגישה נפתחת רק לאחר אישור מנהל המערכת. אם אינך לקוח מפיץ, ניתן להיכנס במצב אורח ולצפות בקטלוג המוצרים.
          </p>
          {onGuest && (
            <button
              type="button"
              onClick={onGuest}
              className="w-full py-3 border-2 border-[#004387]/30 hover:border-[#004387] hover:bg-[#004387]/5 text-[#004387] font-bold rounded-lg transition flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" /> כניסה כאורח — צפייה בלבד
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirebaseAuthView;
