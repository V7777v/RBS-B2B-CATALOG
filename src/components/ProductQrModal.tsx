import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, QrCode, Download, Copy, Check, Share2, ExternalLink, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ProductQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id?: string;
    sku?: string;
    name?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    images?: string[];
  } | null;
  url?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
}

export type ShareModalProps = ProductQrModalProps;

export const ProductQrModal: React.FC<ProductQrModalProps> = ({
  isOpen,
  onClose,
  product,
  url,
  title,
  subtitle,
  imageUrl,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  const defaultProductUrl = typeof window !== "undefined" && product
    ? `${window.location.origin}/?product=${encodeURIComponent(String(product.sku || product.id || ""))}`
    : typeof window !== "undefined" ? window.location.href : "";

  const targetUrl = url || defaultProductUrl;
  const resolvedTitle = title || product?.name || "מוצר בקטלוג";
  const resolvedSubtitle = subtitle || "סרקו במכשיר נייד כדי לפתוח או לשתף";
  const resolvedImage = imageUrl || (product?.images && product.images.length > 0 ? product.images[0] : null);
  const resolvedSku = product?.sku;
  const resolvedBrand = product?.brand;

  useEffect(() => {
    if (!isOpen || !targetUrl) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0c2d57", // RBS Telecom brand navy
        light: "#ffffff",
      },
    })
      .then((qrUrl) => {
        if (isMounted) {
          setQrDataUrl(qrUrl);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || (!product && !url && !title)) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = targetUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const rawName = resolvedSku || product?.id || title || "share";
    const safeSku = rawName.replace(/[^a-zA-Z0-9_\u0590-\u05FF-]/g, "_");
    a.download = `rbs-qr-${safeSku}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const textBody = resolvedSku
          ? `צפו במוצר ${resolvedTitle} (מק״ט: ${resolvedSku}) בקטלוג RBS Telecom:`
          : `צפו ב-${resolvedTitle} בקטלוג RBS Telecom:`;
        await navigator.share({
          title: resolvedTitle,
          text: textBody,
          url: targetUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const waText = resolvedSku
    ? `${resolvedTitle}\nמק״ט: ${resolvedSku}\n${targetUrl}`
    : `${resolvedTitle}\n${targetUrl}`;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0c2d57] to-[#004387] text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <QrCode size={20} className="text-white" />
              </div>
              <div>
                <h3 id="qr-modal-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                  קוד QR לסריקה מהירה
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  {resolvedSubtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="סגור חלון"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 flex flex-col items-center">
            {/* Target Snapshot */}
            {(resolvedTitle || resolvedImage || resolvedSku || resolvedBrand) && (
              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 mb-4 text-right">
                {resolvedImage && (
                  <img
                    referrerPolicy="no-referrer"
                    src={resolvedImage}
                    alt={resolvedTitle}
                    className="w-12 h-12 object-contain rounded-lg bg-white border border-gray-100 p-1 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#0c2d57] truncate">
                    {resolvedTitle}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {resolvedSku && (
                      <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-200/70 px-1.5 py-0.5 rounded">
                        מק״ט: {resolvedSku}
                      </span>
                    )}
                    {resolvedBrand && (
                      <span className="text-[11px] font-bold text-[#004387]">
                        {resolvedBrand}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Presentation Box */}
            <div className="relative p-3 bg-white rounded-2xl border-2 border-dashed border-blue-200 shadow-inner flex flex-col items-center justify-center">
              {/* Corner Accents */}
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#004387] rounded-tr" />
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#004387] rounded-tl" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#004387] rounded-br" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#004387] rounded-bl" />

              {isGenerating ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <div className="w-8 h-8 border-3 border-[#004387] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">יוצר קוד QR...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative group">
                  <img
                    src={qrDataUrl}
                    alt={`קוד QR עבור ${resolvedTitle}`}
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center">
                      <QrCode size={20} className="text-[#004387]" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-red-500 text-xs">
                  שגיאה בטעינת קוד ה-QR
                </div>
              )}
            </div>

            {/* Scanning Guidance */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3 font-medium text-center">
              <Smartphone size={14} className="text-[#004387]" />
              <span>פתחו את מצלמת הטלפון וסרקו לפתיחה ישירה</span>
            </div>

            {/* URL Display */}
            <div className="w-full mt-3 flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-mono text-gray-600 truncate">
              <span className="truncate flex-1 text-left select-all" dir="ltr">
                {targetUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 hover:bg-gray-200 rounded text-gray-700 transition-colors cursor-pointer"
                title="העתק קישור"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Action Buttons Grid */}
            <div className="w-full grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  copied
                    ? "bg-green-50 border-green-300 text-green-700 shadow-xs"
                    : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-[#004387]"
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "הקישור הועתק!" : "העתק קישור"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl || isGenerating}
                className="py-2.5 px-3 bg-[#0c2d57] hover:bg-[#004387] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={16} />
                <span>הורד תמונה</span>
              </button>
            </div>

            {/* Extra Share Option */}
            <div className="w-full flex items-center gap-2 mt-2">
              {"share" in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>שתף באפליקציות</span>
                </button>
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>וואטסאפ</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const ShareModal = ProductQrModal;
export default ProductQrModal;
