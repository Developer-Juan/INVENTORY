import { useEffect, useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, router, usePage } from '@inertiajs/react';

export default function Authenticated({ auth, header, children }) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [openStockMobile, setOpenStockMobile] = useState(false);
    const [openFinanzasMobile, setOpenFinanzasMobile] = useState(false);
    const [openSupport, setOpenSupport] = useState(false);
    const [supportSubject, setSupportSubject] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [supportSubmitting, setSupportSubmitting] = useState(false);

    const pageProps = usePage().props;
    const roles = (pageProps?.auth?.user?.roles ?? []).map((r) => r.name);
    const isAdmin = roles.includes('admin');
    const isDealer = roles.includes('dealer');
    const dealerRating = pageProps?.dealerRating ?? null;
    const supportUnread = pageProps?.supportUnread ?? false;
    const [supportUnreadLive, setSupportUnreadLive] = useState(!!supportUnread);
    const supportTicketCount = pageProps?.supportTicketCount ?? 0;
    const supportUnreadAdmin = pageProps?.supportUnreadAdmin ?? false;
    const supportErrors = pageProps?.errors ?? {};
    const notificationsUnreadCount = pageProps?.notificationsUnreadCount ?? 0;
    const notifications = Array.isArray(pageProps?.notifications) ? pageProps.notifications : [];
    const [openNotificationsPanel, setOpenNotificationsPanel] = useState(false);
    const [notificationsPanelVisible, setNotificationsPanelVisible] = useState(false);
    const [notificationsList, setNotificationsList] = useState(notifications);
    const [notificationsUnreadLive, setNotificationsUnreadLive] = useState(
        Number(notificationsUnreadCount || 0)
    );
    const [showPendingOnly, setShowPendingOnly] = useState(false);
    const pendingNotificationsCount = notificationsList.filter((n) => (
        (n.type === 'support_ticket_new' || n.ticket_id)
            ? n.ticket_status !== 'closed'
            : !n.read_at
    )).length;
    const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-CO') : '—');
    const supportChatView = (() => {
        const loc = pageProps?.ziggy?.location ?? (typeof window !== 'undefined' ? window.location.href : '');
        if (!loc) return false;
        try {
            const url = new URL(loc, 'http://localhost');
            return url.pathname === '/support';
        } catch {
            return false;
        }
    })();

    const submitSupport = (e) => {
        if (e) e.preventDefault();
        if (!supportSubject || !supportMessage) return;
        setSupportSubmitting(true);
        router.post(route('support.store'), {
            subject: supportSubject,
            message: supportMessage,
        }, {
            preserveScroll: true,
            onFinish: () => setSupportSubmitting(false),
            onSuccess: () => {
                setSupportSubject('');
                setSupportMessage('');
                setOpenSupport(false);
                setSupportUnreadLive(false);
            },
        });
    };

    useEffect(() => {
        if (!pageProps?.auth?.user?.id || !window?.Echo) return;
        const userId = pageProps.auth.user.id;
        const channel = window.Echo.private(`support.user.${userId}`);
        channel.listen('.support.message.created', (payload) => {
            if (payload?.message?.sender_user_id !== userId) {
                setSupportUnreadLive(true);
            }
        });
        channel.listen('.support.ticket.closed', (payload) => {
            const closedId = payload?.ticket?.id;
            if (!closedId) return;
            setNotificationsList((prev) => prev.map((n) => {
                if (n.type !== 'support_ticket_new' || n.ticket_id !== closedId) return n;
                return {
                    ...n,
                    ticket_status: payload?.ticket?.status ?? 'closed',
                    ticket_closed_at: payload?.ticket?.closed_at ?? n.ticket_closed_at,
                };
            }));
        });
        const notifChannel = window.Echo.private(`App.Models.User.${userId}`);
        notifChannel.notification((notification) => {
            let payload = notification?.data ?? notification ?? {};
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch {
                    payload = {};
                }
            }
            const dataLevel = (payload?.data && typeof payload.data === 'object') ? payload.data : null;
            const nestedLevel = (dataLevel?.data && typeof dataLevel.data === 'object') ? dataLevel.data : null;
            if (dataLevel && !payload?.ticket_id && !payload?.type) {
                payload = dataLevel;
            }
            if (nestedLevel && !payload?.ticket_id && !payload?.type) {
                payload = nestedLevel;
            }
            const derivedType = payload?.type
                ?? dataLevel?.type
                ?? nestedLevel?.type
                ?? (notification?.type?.includes('SupportTicketCreatedNotification') ? 'support_ticket_new' : notification?.type);
            const inferredTicketType = derivedType ?? (
                (payload?.ticket_id || dataLevel?.ticket_id || nestedLevel?.ticket_id)
                    ? 'support_ticket_new'
                    : derivedType
            );
            const normalized = {
                ...(payload ?? {}),
                id: notification?.id ?? payload?.id ?? dataLevel?.id ?? nestedLevel?.id,
                type: inferredTicketType,
                ticket_id: payload?.ticket_id
                    ?? payload?.ticketId
                    ?? payload?.ticket?.id
                    ?? payload?.ticket?.ticket_id
                    ?? dataLevel?.ticket_id
                    ?? dataLevel?.ticketId
                    ?? dataLevel?.ticket?.id
                    ?? nestedLevel?.ticket_id
                    ?? nestedLevel?.ticketId
                    ?? nestedLevel?.ticket?.id
                    ?? notification?.ticket_id,
                ticket_status: payload?.ticket_status
                    ?? payload?.ticket?.status
                    ?? payload?.status
                    ?? dataLevel?.ticket_status
                    ?? dataLevel?.ticket?.status
                    ?? nestedLevel?.ticket_status
                    ?? nestedLevel?.ticket?.status,
                ticket_closed_at: payload?.ticket_closed_at
                    ?? payload?.ticket?.closed_at
                    ?? payload?.closed_at
                    ?? dataLevel?.ticket_closed_at
                    ?? dataLevel?.ticket?.closed_at
                    ?? nestedLevel?.ticket_closed_at
                    ?? nestedLevel?.ticket?.closed_at,
                read_at: notification?.read_at ?? payload?.read_at ?? dataLevel?.read_at ?? nestedLevel?.read_at,
                created_at: notification?.created_at
                    ?? payload?.created_at
                    ?? payload?.createdAt
                    ?? payload?.created?.at
                    ?? dataLevel?.created_at
                    ?? dataLevel?.createdAt
                    ?? nestedLevel?.created_at
                    ?? new Date().toISOString(),
            };
            if (normalized?.type === 'support_ticket_new' && !normalized.ticket_status) {
                normalized.ticket_status = 'open';
            }
            setNotificationsList((prev) => [normalized, ...prev]);
            setNotificationsUnreadLive((prev) => Number(prev || 0) + 1);
        });
        return () => {
            try { window.Echo.leave(`private-support.user.${userId}`); } catch { /* noop */ }
            try { window.Echo.leave(`private-App.Models.User.${userId}`); } catch { /* noop */ }
        };
    }, [pageProps?.auth?.user?.id]);

    useEffect(() => {
        setNotificationsList(notifications);
        setNotificationsUnreadLive(Number(notificationsUnreadCount || 0));
    }, [notifications, notificationsUnreadCount]);

    useEffect(() => {
        setNotificationsUnreadLive(pendingNotificationsCount);
    }, [pendingNotificationsCount]);

    const navItemClass = (active = false, extra = '') =>
        `w-full flex items-start pl-3 pr-4 py-2 border-l-4 ${active
            ? 'border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 focus:text-indigo-800 dark:focus:text-indigo-200 focus:bg-indigo-100 dark:focus:bg-indigo-900 focus:border-indigo-700 dark:focus:border-indigo-300'
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:text-gray-800 dark:focus:text-gray-200 focus:bg-gray-50 dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600'
        } text-base font-medium focus:outline-none transition duration-150 ease-in-out ${extra}`;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="shrink-0 flex items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800 dark:text-gray-200" />
                                </Link>
                            </div>

                            {/* Dashboard */}
                            <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                <NavLink href={route('dashboard')} active={route().current('dashboard')}>
                                    Dashboard
                                </NavLink>
                            </div>

                            {/* Productos */}
                            {isAdmin && (
                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink
                                        href={route('inventories.index')}
                                        active={route().current('inventories.index')}
                                    >
                                        Productos
                                    </NavLink>
                                </div>
                            )}

                            {/* Ventas */}
                            {(isDealer || isAdmin) && (
                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink href={route('sales.index')} active={route().current('sales.index')}>
                                        Ventas
                                    </NavLink>
                                </div>
                            )}

                            {/* Calificaciones */}
                            {(isDealer || isAdmin) && (
                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink href={route('quality.index')} active={route().current('quality.index')}>
                                        Calificaciones
                                    </NavLink>
                                </div>
                            )}

                            {/* Regalos */}
                            {isAdmin && (
                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink href={route('gifts.index')} active={route().current('gifts.index')}>
                                        Regalos
                                    </NavLink>
                                </div>
                            )}

                            {/* Usuarios */}
                            {isAdmin && (
                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink href={route('users.index')} active={route().current('users.index')}>
                                        Usuarios
                                    </NavLink>
                                </div>
                            )}

                            {/* Dropdown Stock */}
                            {(isDealer || isAdmin) && (
                                <div className="hidden sm:-my-px sm:ml-10 sm:flex items-center">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                                            >
                                                Stock
                                                <svg
                                                    className="ml-2 -mr-0.5 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content align="left">
                                            <Dropdown.Link href={route('stock.summary')}>Stock Totales</Dropdown.Link>
                                            <Dropdown.Link href={route('stock.index')}>Stock por Ubicación</Dropdown.Link>
                                            <Dropdown.Link href={route('transfers.create')}>Transferencias</Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            )}

                            {/* Dropdown Finanzas */}
                            {isAdmin && (
                                <div className="hidden sm:-my-px sm:ml-10 sm:flex items-center">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                                            >
                                                Finanzas
                                                <svg
                                                    className="ml-2 -mr-0.5 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content align="left">
                                            <Dropdown.Link href={route('balances.index')}>Balances Dealers</Dropdown.Link>
                                            <Dropdown.Link href={route('cash.index')}>Caja / Efectivo</Dropdown.Link>
                                            <Dropdown.Link href={route('points.index')}>Puntos</Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            )}
                        </div>

                        {/* Perfil */}
                        <div className="hidden sm:flex sm:items-center sm:ml-6 gap-3 relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setNotificationsPanelVisible(true);
                                    setOpenNotificationsPanel(true);
                                }}
                                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Notificaciones"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-5 w-5 ${pendingNotificationsCount > 0 ? 'animate-tada' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                                    <path d="M9 18a2 2 0 004 0H9z" />
                                </svg>
                                {pendingNotificationsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center gap-1">
                                        <span className="min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center px-1">
                                            {pendingNotificationsCount}
                                        </span>
                                    </span>
                                )}
                            </button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {auth.user.name}
                                        <svg
                                            className="ml-2 -mr-0.5 h-4 w-4"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Perfil</Dropdown.Link>
                                    {isDealer && dealerRating && (
                                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                            Mi calificación: {Number(dealerRating.avg ?? 0).toFixed(2)} ★
                                            {dealerRating.total ? ` · ${dealerRating.total} opiniones` : ''}
                                        </div>
                                    )}
                                    {isAdmin && (
                                        <Dropdown.Link href={route('support.index')}>
                                            <span className="inline-flex items-center gap-2">
                                                Tickets
                                                {supportUnreadAdmin && (
                                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                                )}
                                                {supportTicketCount > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-600 text-white">
                                                        {supportTicketCount}
                                                    </span>
                                                )}
                                            </span>
                                        </Dropdown.Link>
                                    )}
                                    {isDealer && (
                                        <Dropdown.Link href={route('support.index')}>Mis tickets</Dropdown.Link>
                                    )}
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Cerrar sesión
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile menu toggle */}
                        <div className="-mr-2 flex items-center sm:hidden gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setNotificationsPanelVisible(true);
                                    setOpenNotificationsPanel(true);
                                }}
                                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Notificaciones"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-5 w-5 ${pendingNotificationsCount > 0 ? 'animate-tada' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                                    <path d="M9 18a2 2 0 004 0H9z" />
                                </svg>
                                {pendingNotificationsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center gap-1">
                                        <span className="min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center px-1">
                                            {pendingNotificationsCount}
                                        </span>
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setShowingNavigationDropdown((p) => !p)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                            >
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path
                                        className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                    <div className="pt-2 pb-3 space-y-1">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                            Dashboard
                        </ResponsiveNavLink>

                        {(isDealer || isAdmin) && (
                            <ResponsiveNavLink href={route('sales.index')} active={route().current('sales.index')}>
                                Ventas
                            </ResponsiveNavLink>
                        )}

                        {(isDealer || isAdmin) && (
                            <ResponsiveNavLink href={route('quality.index')} active={route().current('quality.index')}>
                                Calificaciones
                            </ResponsiveNavLink>
                        )}

                        {isAdmin && (
                            <ResponsiveNavLink href={route('gifts.index')} active={route().current('gifts.index')}>
                                Regalos
                            </ResponsiveNavLink>
                        )}

                        {isAdmin && (
                            <ResponsiveNavLink href={route('users.index')} active={route().current('users.index')}>
                                Usuarios
                            </ResponsiveNavLink>
                        )}

                        {/* Dropdown STOCK mobile con estilo igual */}
                        {(isDealer || isAdmin) && (
                            <div>
                                <button
                                    onClick={() => setOpenStockMobile((p) => !p)}
                                    className={navItemClass(openStockMobile)}
                                >
                                    <span className="flex-1 text-left">Stock</span>
                                    <svg
                                        className={`h-4 w-4 mt-1 transition-transform ${openStockMobile ? 'rotate-180' : ''
                                            }`}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>

                                {openStockMobile && (
                                    <div className="pl-6">
                                        <ResponsiveNavLink href={route('stock.summary')}>Stock Totales</ResponsiveNavLink>
                                        <ResponsiveNavLink href={route('stock.index')}>Stock por Ubicación</ResponsiveNavLink>
                                        <ResponsiveNavLink href={route('transfers.create')}>Transferencias</ResponsiveNavLink>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dropdown FINANZAS mobile */}
                        {isAdmin && (
                            <div>
                                <button
                                    onClick={() => setOpenFinanzasMobile((p) => !p)}
                                    className={navItemClass(openFinanzasMobile)}
                                >
                                    <span className="flex-1 text-left">Finanzas</span>
                                    <svg
                                        className={`h-4 w-4 mt-1 transition-transform ${openFinanzasMobile ? 'rotate-180' : ''
                                            }`}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>

                                {openFinanzasMobile && (
                                    <div className="pl-6">
                                        <ResponsiveNavLink href={route('balances.index')}>
                                            Balances Dealers
                                        </ResponsiveNavLink>
                                        <ResponsiveNavLink href={route('cash.index')}>
                                            Caja / Efectivo
                                        </ResponsiveNavLink>
                                        <ResponsiveNavLink href={route('points.index')}>
                                            Puntos
                                        </ResponsiveNavLink>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Perfil */}
                    <div className="pt-4 pb-1 border-t border-gray-200 dark:border-gray-600">
                        <div className="px-4">
                            <div className="font-medium text-base text-gray-800 dark:text-gray-200">
                                {auth.user.name}
                            </div>
                            <div className="font-medium text-sm text-gray-500">{auth.user.email}</div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Perfil</ResponsiveNavLink>
                            {isDealer && dealerRating && (
                                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    Mi calificación: {Number(dealerRating.avg ?? 0).toFixed(2)} ★
                                    {dealerRating.total ? ` · ${dealerRating.total} opiniones` : ''}
                                </div>
                            )}
                            {isAdmin && (
                                <ResponsiveNavLink href={route('support.index')}>
                                    <span className="inline-flex items-center gap-2">
                                        Tickets
                                        {supportUnreadAdmin && (
                                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                        )}
                                        {supportTicketCount > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-600 text-white">
                                                {supportTicketCount}
                                            </span>
                                        )}
                                    </span>
                                </ResponsiveNavLink>
                            )}
                            {isDealer && (
                                <ResponsiveNavLink href={route('support.index')}>Mis tickets</ResponsiveNavLink>
                            )}
                            <ResponsiveNavLink method="post" href={route('logout')} as="button">
                                Cerrar sesión
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white dark:bg-gray-800 shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            <main>{children}</main>

            {/* Botón flotante de soporte */}
            {isDealer && !supportChatView && (
                <button
                    type="button"
                    onClick={() => {
                        setOpenSupport(true);
                        setSupportUnreadLive(false);
                    }}
                    className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-3 shadow-lg hover:bg-blue-700 group"
                >
                    {supportUnreadLive && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <span aria-hidden="true">💬</span>
                    <span className="text-sm font-medium max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-w-[6rem] group-hover:opacity-100">
                        Soporte
                    </span>
                </button>
            )}

            {openSupport && isDealer && (
                <div className="fixed inset-0 z-[60]">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setOpenSupport(false)}
                    />
                    <div className="absolute bottom-24 right-6 w-[min(26rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">Soporte</div>
                            <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                onClick={() => setOpenSupport(false)}
                            >
                                v.0.1
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
                                Hola 👋, cuéntanos tu solicitud.
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400">Asunto</label>
                                <input
                                    className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    placeholder="Ej: Problema con entrega"
                                    value={supportSubject}
                                    onChange={(e) => setSupportSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400">Descripción</label>
                                <textarea
                                    className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    rows={3}
                                    placeholder="Escribe los detalles del problema"
                                    value={supportMessage}
                                    onChange={(e) => setSupportMessage(e.target.value)}
                                />
                            </div>
                            {supportErrors?.subject && (
                                <div className="text-xs text-red-600">{supportErrors.subject}</div>
                            )}
                            {supportErrors?.message && (
                                <div className="text-xs text-red-600">{supportErrors.message}</div>
                            )}
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <Link
                                href={route('support.index')}
                                className="text-sm text-indigo-600 dark:text-indigo-400"
                            >
                                Ver historial
                            </Link>
                            <button
                                type="button"
                                onClick={submitSupport}
                                disabled={supportSubmitting || !supportSubject || !supportMessage}
                                className={`px-4 py-2 rounded-md text-white text-sm ${
                                    supportSubmitting || !supportSubject || !supportMessage
                                        ? 'bg-gray-400'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {supportSubmitting ? 'Enviando' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {openNotificationsPanel && (
                <div className="fixed inset-0 z-[70]">
                    <div
                        className={`absolute inset-0 bg-black/40 transition-opacity duration-350 ${notificationsPanelVisible ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => {
                            setNotificationsPanelVisible(false);
                            setTimeout(() => setOpenNotificationsPanel(false), 350);
                        }}
                    />
                    <div
                        className={`absolute inset-y-0 right-0 w-[min(90vw,24rem)] bg-white dark:bg-gray-800 shadow-xl flex flex-col transform transition-transform duration-350 ${notificationsPanelVisible ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">Notificaciones</div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPendingOnly((prev) => !prev)}
                                    className={`text-xs px-2 py-1 rounded-md border ${
                                        showPendingOnly
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                    {showPendingOnly ? 'Ver todas' : 'Solo pendientes'}
                                </button>
                            <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                onClick={() => {
                                    setNotificationsPanelVisible(false);
                                    setTimeout(() => setOpenNotificationsPanel(false), 350);
                                }}
                            >
                                ✕
                            </button>
                            </div>
                        </div>
                                    <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-700">
                            {(() => {
                                const visibleNotifications = showPendingOnly
                                    ? notificationsList.filter((n) => (
                                        (n.type === 'support_ticket_new' || n.ticket_id)
                                            ? n.ticket_status !== 'closed'
                                            : !n.read_at
                                    ))
                                    : notificationsList;
                                if (visibleNotifications.length === 0) {
                                    return (
                                        <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                                            Sin notificaciones.
                                        </div>
                                    );
                                }
                                return visibleNotifications.map((n) => {
                                    const isTicket = n.type === 'support_ticket_new' || n.ticket_id;
                                    const canOpenTicket = isTicket && n.ticket_id;
                                    const ticketStatus = n.ticket_status || '';
                                    const statusLabel = ticketStatus
                                        ? (ticketStatus === 'closed' ? 'Cerrado' : 'Pendiente')
                                        : (n.read_at ? 'Atendido' : 'Pendiente');
                                const statusClass = ticketStatus
                                    ? (ticketStatus === 'closed'
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200')
                                    : (n.read_at
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200');
                                    const content = (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {n.title || (isTicket ? 'Nuevo ticket de soporte' : 'Notificación')}
                                                </div>
                                                {isTicket && (
                                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                                                        {statusLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                                {n.message || 'Notificación'}
                                            </div>
                                            {n.type === 'low_stock' && (
                                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                                                    {n.inventory_name} · {n.location_name}
                                                </div>
                                            )}
                                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                Creado: {fmtDate(n.created_at)}
                                            </div>
                                        </div>
                                    );
                                    const baseClass = `px-4 py-3 text-sm ${
                                        !n.read_at ? 'bg-red-50/60 dark:bg-red-900/10 font-semibold' : 'text-gray-700 dark:text-gray-200'
                                    }`;
                                    return canOpenTicket ? (
                                        <Link
                                            key={n.id}
                                            href={route('support.index', { ticket_id: n.ticket_id })}
                                            className={`${baseClass} block hover:bg-gray-100 dark:hover:bg-gray-700`}
                                            onClick={() => {
                                                setNotificationsPanelVisible(false);
                                                setTimeout(() => setOpenNotificationsPanel(false), 350);
                                            }}
                                        >
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={n.id} className={baseClass}>
                                            {content}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                href={route('notifications.index')}
                                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
                                onClick={() => {
                                    setNotificationsPanelVisible(false);
                                    setTimeout(() => setOpenNotificationsPanel(false), 350);
                                }}
                            >
                                Ver todas
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
