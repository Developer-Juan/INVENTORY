import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { Head, usePage } from '@inertiajs/react';

export default function Edit({ auth, mustVerifyEmail, status }) {
    const { dealerRating } = usePage().props;
    const roles = (auth?.user?.roles ?? []).map((r) => r.name);
    const isDealer = roles.includes('dealer');
    const ratingAvg = Number(dealerRating?.avg ?? 0);
    const ratingTotal = Number(dealerRating?.total ?? 0);

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Profile</h2>}
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    {isDealer && (
                        <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                            <div className="max-w-xl">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Calificación como dealer
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Resumen de opiniones recibidas.
                                </p>
                                <div className="mt-4 flex items-center gap-4">
                                    <div className="flex gap-1 text-yellow-400">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <span
                                                key={n}
                                                className={ratingAvg >= n ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {ratingAvg.toFixed(2)} · {ratingTotal} opiniones
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
