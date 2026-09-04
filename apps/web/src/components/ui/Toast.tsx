import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { useI18n } from "@paca/api";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-red-primary shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
};

const borderColors: Record<ToastType, string> = {
  success: "border-emerald-500/30",
  error: "border-red-primary/30",
  info: "border-blue-400/30",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const { t } = useI18n();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => onRemove(toast.id), 300);
      return () => clearTimeout(timer);
    }
  }, [exiting, toast.id, onRemove]);

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
        bg-white dark:bg-gray-800 border ${borderColors[toast.type]}
        shadow-lg shadow-black/10 dark:shadow-black/30
        w-full sm:min-w-[280px] sm:max-w-[400px]
        transition-all duration-300
        ${exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-slideInRight"}
      `}
    >
      {icons[toast.type]}
      <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">{toast.message}</p>
      <button
        onClick={() => setExiting(true)}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
        aria-label={t.common.close}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
