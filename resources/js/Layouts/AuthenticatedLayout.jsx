import { useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';

export default function Authenticated({ auth, header, children }) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [openStockMobile, setOpenStockMobile] = useState(false);
    const [openFinanzasMobile, setOpenFinanzasMobile] = useState(false);

    const roles = (usePage().props?.auth?.user?.roles ?? []).map((r) => r.name);
    const isAdmin = roles.includes('admin');
    const isDealer = roles.includes('dealer');

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
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            )}
                        </div>

                        {/* Perfil */}
                        <div className="hidden sm:flex sm:items-center sm:ml-6">
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
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Cerrar sesión
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile menu toggle */}
                        <div className="-mr-2 flex items-center sm:hidden">
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
        </div>
    );
}
