import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onFallbackTo2D: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class Cabinet3DErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'שגיאה בטעינת מנוע תלת־הממד' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Cabinet3DErrorBoundary] Caught 3D error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="border-4 border-amber-500/60 bg-slate-900 p-6 text-center text-white flex flex-col items-center justify-center min-h-[440px] space-y-3" dir="rtl">
          <AlertTriangle size={36} className="text-amber-400" />
          <div className="text-base font-bold text-slate-100">
            תצוגת התלת־ממד אינה זמינה בדפדפן או במכשיר זה
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            הקונפיגורטור ממשיך לפעול כרגיל במבט החזיתי. כל המוצרים, המיקומים והבחירות שלכם נשמרו במלואם.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onFallbackTo2D();
            }}
            className="px-4 py-2 bg-[#004387] hover:bg-[#003166] text-white font-bold text-xs rounded flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>חזור למבט חזיתי (2D)</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
