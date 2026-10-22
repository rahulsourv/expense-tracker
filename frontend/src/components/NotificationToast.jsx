import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, ShieldAlert, X } from 'lucide-react';

export const NotificationToast = ({ notifications, onDismiss, onAction }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => {
          const isError = notif.type === 'error' || notif.type === 'danger';
          const isWarning = notif.type === 'warning';
          const isSuccess = notif.type === 'success';

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto border-3 border-black p-4 shadow-brutal flex items-start gap-3 ${
                isError
                  ? 'bg-neo-red text-white'
                  : isWarning
                  ? 'bg-neo-yellow text-black'
                  : isSuccess
                  ? 'bg-neo-green text-black'
                  : 'bg-white text-black'
              }`}
            >
              <div
                className={`p-1.5 border-2 border-black shrink-0 ${
                  isError ? 'bg-black text-neo-red' : 'bg-black text-white'
                }`}
              >
                {isError ? (
                  <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                ) : isSuccess ? (
                  <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Info className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono font-black uppercase tracking-wider">
                  {notif.title || (isError ? 'ALERT' : isSuccess ? 'SUCCESS' : 'NOTICE')}
                </div>
                <div className="text-xs font-bold mt-0.5 leading-snug">
                  {notif.message}
                </div>
                {notif.action && <button type="button" onClick={() => onAction?.(notif)} className="mt-2 rounded-md border border-current px-2 py-1 text-[10px] font-black uppercase hover:bg-black hover:text-white">{notif.action.label}</button>}
              </div>

              <button
                onClick={() => onDismiss(notif.id)}
                className="p-1 border border-black hover:bg-black hover:text-white transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
