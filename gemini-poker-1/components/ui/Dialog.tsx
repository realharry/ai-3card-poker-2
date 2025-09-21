import React, { useState, useEffect, useCallback } from 'react';
import { XIcon } from '../icons';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
        }
    }, [isOpen]);
    
    const onAnimationEnd = () => {
        if (!isOpen) {
            setIsRendered(false);
        }
    };

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isRendered) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center" 
            aria-labelledby="dialog-title" 
            role="dialog" 
            aria-modal="true"
        >
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity ${isOpen ? 'animate-[fade-in_0.3s_ease-out]' : 'animate-[fade-out_0.3s_ease-in]'}`}
                style={{ animationFillMode: 'forwards' }}
                onClick={onClose}
            ></div>
            
            <div
                className={`relative bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col transition-transform ${isOpen ? 'animate-[slide-in-from-bottom_0.3s_ease-out]' : 'animate-[slide-out-to-bottom_0.3s_ease-in]'}`}
                style={{ animationFillMode: 'forwards' }}
                onAnimationEnd={onAnimationEnd}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 id="dialog-title" className="text-xl font-bold text-amber-300">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
