import React from 'react';
import toast from 'react-hot-toast';

export function confirmToast({
    message = '¿Confirmar acción?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    duration = 8000,
} = {}) {
    const id = toast((t) => (
        <div className="flex items-center gap-3">
            <div className="text-sm text-gray-800">{message}</div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (typeof onCancel === 'function') onCancel();
                    }}
                    className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600"
                >
                    {cancelText}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (typeof onConfirm === 'function') onConfirm();
                    }}
                    className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                >
                    {confirmText}
                </button>
            </div>
        </div>
    ), { duration });

    return id;
}
