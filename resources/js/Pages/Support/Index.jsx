// resources/js/Pages/Support/Index.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function SupportIndex() {
    const { auth, errors = {}, tickets = [], selectedTicket = null, isAdmin = false } = usePage().props;
    const [ticketList, setTicketList] = useState(tickets);
    const [activeTicket, setActiveTicket] = useState(selectedTicket);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [reply, setReply] = useState('');
    const messagesEndRef = useRef(null);
    const activeTicketIdRef = useRef(null);

    const canCreate = !isAdmin;
    const sortTickets = (list) => [...list].sort((a, b) => {
        const aDate = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bDate = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        if (bDate !== aDate) return bDate - aDate;
        return (b?.id ?? 0) - (a?.id ?? 0);
    });

    const submitTicket = (e) => {
        e.preventDefault();
        router.post(route('support.store'), { subject, message }, {
            preserveScroll: true,
            onSuccess: () => {
                setSubject('');
                setMessage('');
            },
        });
    };

    const submitReply = (e) => {
        e.preventDefault();
        if (!activeTicket?.id) return;
        if (activeTicket.status === 'closed') return;
        router.post(route('support.messages.store', activeTicket.id), { message: reply }, {
            preserveScroll: true,
            onSuccess: () => setReply(''),
        });
    };

    const closeTicket = () => {
        if (!activeTicket?.id) return;
        router.post(route('support.close', activeTicket.id), {}, { preserveScroll: true });
    };

    const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-CO') : '—');

    useEffect(() => {
        setTicketList(sortTickets(tickets));
        setActiveTicket(selectedTicket);
    }, [tickets, selectedTicket]);

    useEffect(() => {
        activeTicketIdRef.current = activeTicket?.id ?? null;
    }, [activeTicket?.id]);

    useEffect(() => {
        if (!auth?.user?.id || !window?.Echo) return;
        const userId = auth.user.id;
        const channel = window.Echo.private(`support.user.${userId}`);
        channel.listen('.support.message.created', (payload) => {
            if (!payload?.ticket_id || !payload?.message) return;
            const incomingTicketId = payload.ticket_id;
            setTicketList((prev) => {
                const isActive = activeTicketIdRef.current === incomingTicketId;
                const next = prev.map((t) =>
                    t.id === incomingTicketId
                        ? {
                            ...t,
                            last_message_at: payload.ticket?.last_message_at,
                            status: payload.ticket?.status ?? t.status,
                            unread: isActive ? false : (payload.message.sender_user_id !== userId),
                        }
                        : t
                );
                const exists = next.some((t) => t.id === incomingTicketId);
                if (!exists && payload.ticket) {
                    next.unshift({
                        id: payload.ticket.id,
                        subject: payload.ticket.subject,
                        status: payload.ticket.status,
                        last_message_at: payload.ticket.last_message_at,
                        dealer: payload.ticket.dealer_name ? { name: payload.ticket.dealer_name } : undefined,
                        unread: payload.message.sender_user_id !== userId,
                    });
                }
                return sortTickets(next);
            });

            setActiveTicket((prev) => {
                if (!prev || prev.id !== incomingTicketId) return prev;
                const msg = payload.message;
                const nextMessages = Array.isArray(prev.messages) ? [...prev.messages] : [];
                if (!nextMessages.find((m) => m.id === msg.id)) {
                    nextMessages.push({
                        id: msg.id,
                        body: msg.body,
                        created_at: msg.created_at,
                        sender_user_id: msg.sender_user_id,
                        sender: { name: msg.sender_name },
                    });
                }
                return {
                    ...prev,
                    status: payload.ticket?.status ?? prev.status,
                    closed_at: payload.ticket?.closed_at ?? prev.closed_at,
                    last_message_at: payload.ticket?.last_message_at ?? prev.last_message_at,
                    messages: nextMessages,
                };
            });
        });
        return () => {
            try { window.Echo.leave(`private-support.user.${userId}`); } catch { /* noop */ }
        };
    }, [auth?.user?.id]);

    useEffect(() => {
        if (!activeTicket?.id) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [activeTicket?.id, activeTicket?.status, activeTicket?.messages?.length]);

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800">Soporte</h2>}
        >
            <Head title="Soporte" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
                {canCreate && (
                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-semibold mb-3">Nuevo ticket</h3>
                        <form onSubmit={submitTicket} className="space-y-3">
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                placeholder="Asunto"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                            <textarea
                                className="w-full border rounded px-3 py-2"
                                rows={3}
                                placeholder="Describe tu solicitud"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-md bg-blue-600 text-white"
                                >
                                    Crear ticket
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1 border rounded-lg">
                            <div className="px-3 py-2 border-b font-semibold">Tickets</div>
                            <div className="divide-y max-h-[60vh] overflow-auto">
                                {ticketList.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={route('support.index', { ticket_id: t.id })}
                                        preserveScroll
                                        className={`block px-3 py-2 text-sm hover:bg-gray-50 ${
                                            activeTicket?.id === t.id ? 'bg-gray-100' : ''
                                        } ${t.unread ? 'font-semibold' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {t.unread && <span className="h-2 w-2 rounded-full bg-red-500" />}
                                            <div className="font-medium">#{t.id} {t.subject}</div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {isAdmin ? (t.dealer?.name ?? '—') : 'Mi ticket'} · {fmtDate(t.last_message_at)}
                                        </div>
                                    </Link>
                                ))}
                                {ticketList.length === 0 && (
                                    <div className="px-3 py-6 text-sm text-gray-500 text-center">
                                        Sin tickets.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-2 border rounded-lg">
                            <div className="px-3 py-2 border-b font-semibold flex items-center justify-between">
                                <span>
                                    {activeTicket ? `Ticket #${activeTicket.id}` : 'Selecciona un ticket'}
                                </span>
                                {isAdmin && activeTicket && activeTicket.status !== 'closed' && (
                                    <button
                                        type="button"
                                        onClick={closeTicket}
                                        className="px-3 py-1 text-xs rounded-md border text-red-600"
                                    >
                                        Cerrar ticket
                                    </button>
                                )}
                            </div>
                            {activeTicket ? (
                                <>
                                    <div className="p-3 space-y-3 max-h-[50vh] overflow-auto">
                                        {activeTicket.messages?.map((m) => {
                                            const mine = m.sender_user_id === auth.user.id;
                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`text-sm rounded-lg px-3 py-2 max-w-[80%] ${
                                                        mine ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    <div className="text-xs opacity-80 mb-1">
                                                        {m.sender?.name ?? '—'} · {fmtDate(m.created_at)}
                                                    </div>
                                                    <div>{m.body}</div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                        {activeTicket.status === 'closed' && (
                                            <div className="text-xs text-gray-600 bg-gray-100 rounded-md px-3 py-2 text-center space-y-1">
                                                <div>Este ticket está cerrado.</div>
                                                {activeTicket.closed_at && (
                                                    <div className="text-[11px] text-gray-500">
                                                        {fmtDate(activeTicket.closed_at)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(!activeTicket.messages || activeTicket.messages.length === 0) && (
                                            <div className="text-sm text-gray-500">Sin mensajes.</div>
                                        )}
                                    </div>
                                    <form onSubmit={submitReply} className="p-3 border-t flex gap-2">
                                        <input
                                            className="flex-1 border rounded px-3 py-2"
                                            placeholder="Escribe un mensaje"
                                            value={reply}
                                            onChange={(e) => setReply(e.target.value)}
                                            disabled={activeTicket.status === 'closed'}
                                        />
                                        <button
                                            type="submit"
                                            disabled={activeTicket.status === 'closed'}
                                            className={`px-4 py-2 rounded-md text-white ${
                                                activeTicket.status === 'closed' ? 'bg-gray-400' : 'bg-green-600'
                                            }`}
                                        >
                                            Enviar
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="p-4 text-sm text-gray-500">Selecciona un ticket para ver el chat.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}



