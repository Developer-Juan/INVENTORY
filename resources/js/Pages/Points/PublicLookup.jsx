// resources/js/Pages/Points/PublicLookup.jsx
import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function PublicLookup() {
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const normalizePhone = (value) => String(value ?? '').replace(/\D+/g, '');

    async function submit(e) {
        e.preventDefault();
        const normalized = normalizePhone(phone);
        if (normalized.length < 7 || normalized.length > 15) {
            setError('Ingresa un número válido (7–15 dígitos).');
            setResult(null);
            return;
        }
        setError('');
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(route('points.public.lookup', { phone: normalized }), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (!data?.found) {
                setResult({ found: false });
                return;
            }
            setResult({
                found: true,
                name: data.user?.name ?? '',
                phone: data.user?.phone ?? normalized,
                points: data.user?.points_balance ?? 0,
                breakdown: Array.isArray(data?.breakdown) ? data.breakdown : [],
            });
        } catch (e) {
            console.error(e);
            setError('No se pudo consultar en este momento.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <GuestLayout>
            <Head title="Consultar puntos" />

            <div>
                <h1 className="text-xl font-semibold text-gray-600">Consulta de puntos</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Ingresa tu número de celular para ver el saldo de puntos.
                </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <InputLabel htmlFor="phone" value="Número de celular" />
                    <div className="mt-1">
                        <PhoneInput
                            country="co"
                            value={phone}
                            onChange={(value) => setPhone(value)}
                            inputClass="w-full"
                            inputStyle={{ width: '100%', height: '42px' }}
                            inputProps={{ id: 'phone', name: 'phone' }}
                        />
                    </div>
                    <InputError message={error} className="mt-2" />
                </div>

                <div className="flex items-center justify-end">
                    <PrimaryButton disabled={loading}>
                        {loading ? 'Consultando…' : 'Consultar puntos'}
                    </PrimaryButton>
                </div>
            </form>

            {result && result.found === false && (
                <div className="mt-4 text-sm text-gray-600">
                    No encontramos un usuario con ese número.
                </div>
            )}

            {result && result.found && (
                <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                    <div className="text-sm text-gray-500">Usuario</div>
                    <div className="font-semibold">{result.name || '—'}</div>
                    <div className="text-sm text-gray-500 mt-2">Puntos</div>
                    <div className="text-2xl font-bold">
                        {Number(result.points).toLocaleString('es-CO')}
                    </div>
                    {result.breakdown?.length > 0 && (
                        <div className="mt-4">
                            <div className="text-sm text-gray-500 mb-2">
                                Desglose por vendedor
                            </div>
                            <div className="divide-y border rounded-md bg-white">
                                {result.breakdown.map((row, idx) => (
                                    <div key={`${row.admin_id ?? 'na'}-${idx}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <span className="text-gray-700">
                                            {row.admin_name || 'Sin admin'}
                                        </span>
                                        <span className="font-semibold">
                                            {Number(row.points_balance || 0).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </GuestLayout>
    );
}
