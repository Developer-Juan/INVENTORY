import React from 'react';
import toast from 'react-hot-toast';

export function promptToast({
    message = 'Escribe un valor',
    placeholder = '',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    defaultValue = '',
    onConfirm,
    onCancel,
    duration = 12000,
} = {}) {
    const inputRef = { current: null };

    const id = toast((t) => (
        <div className="flex flex-col gap-3 min-w-[16rem]">
            <div className="text-sm text-gray-800">{message}</div>
            <input
                type="text"
                defaultValue={defaultValue}
                placeholder={placeholder}
                ref={(el) => { inputRef.current = el; }}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-800"
                autoFocus
            />
            <div className="flex items-center justify-end gap-2">
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
                        const value = inputRef.current?.value ?? '';
                        if (typeof onConfirm === 'function') onConfirm(value);
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
