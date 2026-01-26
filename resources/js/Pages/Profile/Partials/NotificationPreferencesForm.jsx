import { useForm } from '@inertiajs/react';

export default function NotificationPreferencesForm({ enabled = true, className = '' }) {
    const form = useForm({
        mail_notifications_enabled: Boolean(enabled),
    });

    const submit = (e) => {
        e.preventDefault();
        form.patch(route('profile.notifications'), {
            preserveScroll: true,
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Preferencias de notificaciones
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Controla si quieres recibir correos informativos cuando ocurran eventos importantes.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div className="flex items-start justify-between gap-4 text-sm text-gray-700 dark:text-gray-200">
                    <div>
                        <div className="font-medium">Enviar notificaciones por correo</div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Ej: tickets nuevos, avisos de stock y notificaciones generales.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            form.setData('mail_notifications_enabled', !form.data.mail_notifications_enabled)
                        }
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                            form.data.mail_notifications_enabled
                                ? 'bg-indigo-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        aria-pressed={form.data.mail_notifications_enabled}
                        aria-label="Activar correos"
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                                form.data.mail_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition"
                        disabled={form.processing}
                    >
                        Guardar
                    </button>
                    {form.recentlySuccessful && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Guardado.</p>
                    )}
                </div>
            </form>
        </section>
    );
}
