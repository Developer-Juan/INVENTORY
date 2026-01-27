// resources/js/Pages/Quality/Public.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import toast from 'react-hot-toast';

function StarRating({ value, onChange }) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className={`text-xl ${value >= n ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                    aria-label={`Calificar ${n} estrellas`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

export default function QualityPublic({
    tokenValid = false,
    message = '',
    token = null,
    sale = null,
    dealer = null,
}) {
    const [ratingDealer, setRatingDealer] = useState(0);
    const [comment, setComment] = useState('');
    const [productRatings, setProductRatings] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const items = useMemo(() => (sale?.items ?? []), [sale]);
    const csrfToken =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const setProductRating = (saleItemId, rating) => {
        setProductRatings((prev) => ({ ...prev, [saleItemId]: rating }));
    };

    async function submit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!ratingDealer) {
            setError('Califica al dealer.');
            return;
        }

        const payloadRatings = items.map((it) => ({
            sale_item_id: it.id,
            rating: productRatings[it.id] || 0,
        }));
        if (payloadRatings.some((r) => r.rating < 1)) {
            setError('Califica todos los productos.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(route('quality.public.submit', token, false), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    rating_dealer: ratingDealer,
                    comment,
                    product_ratings: payloadRatings,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                const msg =
                    data?.message ||
                    (data?.errors
                        ? Object.values(data.errors).flat().join(' ')
                        : 'No se pudo enviar.');
                setError(msg);
                return;
            }
            setSuccess('¡Gracias por tu calificación!');
        } catch (e) {
            console.error(e);
            setError('No se pudo enviar.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (success) toast.success('La calificación ya fue enviada');
    }, [success]);

    return (
        <GuestLayout>
            <Head title="Calidad de servicio" />

            <div className="text-gray-900 dark:text-gray-100">
                <h1 className="text-xl font-semibold">Calidad de servicio</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Tu opinión nos ayuda a mejorar.
                </p>
            </div>

            {!tokenValid && (
                <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                    {message || 'Link inválido.'}
                </div>
            )}

            {tokenValid && !success && (
                <form onSubmit={submit} className="mt-6 space-y-5">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Venta #{sale?.id ?? '—'} · Dealer: {dealer?.name ?? '—'}
                    </div>

                    <div>
                        <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Calificación del dealer</label>
                        <StarRating value={ratingDealer} onChange={setRatingDealer} />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm text-gray-700 dark:text-gray-300">Productos</label>
                        {items.map((it) => (
                            <div key={it.id} className="flex items-center justify-between gap-3">
                                <div className="text-sm text-gray-800 dark:text-gray-200">
                                    {it.inventory?.name ?? `#${it.inventory_id}`}
                                </div>
                                <StarRating
                                    value={productRatings[it.id] || 0}
                                    onChange={(v) => setProductRating(it.id, v)}
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Comentarios</label>
                        <textarea
                            className="w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Escribe tus observaciones"
                        />
                    </div>

                    {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? 'Enviando…' : 'Enviar calificación'}
                        </button>
                    </div>
                </form>
            )}

            {tokenValid && success && (
                <div className="mt-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 grid place-items-center text-3xl">
                        ✅
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        ¡Gracias por comprar con nosotros!
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Tu calificación ya fue enviada.
                    </p>
                </div>
            )}
        </GuestLayout>
    );
}
