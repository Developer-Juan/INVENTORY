<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Demasiadas solicitudes</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

            :root {
                --sand-50: #f8f5f0;
                --ink-900: #171415;
                --ink-700: #2e2a2c;
                --ink-600: #4b4649;
                --ink-500: #6a6468;
                --ink-300: #cfc7c3;
                --ink-200: #e5ded8;
                --aurora-1: #ffe4b5;
                --aurora-2: #e3d1ff;
            }

            * { box-sizing: border-box; }

            body {
                margin: 0;
                font-family: 'Plus Jakarta Sans', sans-serif;
                background: var(--sand-50);
                color: var(--ink-900);
                min-height: 100vh;
            }

            .font-display {
                font-family: 'Clash Display', 'Plus Jakarta Sans', sans-serif;
            }

            .page {
                position: relative;
                min-height: 100vh;
                overflow: hidden;
                display: grid;
                place-items: center;
                padding: 48px 24px;
            }

            .aurora {
                position: absolute;
                inset: auto;
                border-radius: 999px;
                filter: blur(120px);
                opacity: 0.7;
                pointer-events: none;
            }

            .aurora.one {
                top: -120px;
                right: -80px;
                width: 420px;
                height: 420px;
                background: var(--aurora-1);
            }

            .aurora.two {
                bottom: -160px;
                left: -120px;
                width: 520px;
                height: 520px;
                background: var(--aurora-2);
            }

            .grid-bg {
                position: absolute;
                inset: 0;
                background-image: radial-gradient(circle at 1px 1px, rgba(23, 20, 21, 0.08) 1px, transparent 0);
                background-size: 28px 28px;
                opacity: 0.7;
            }

            .card {
                position: relative;
                max-width: 780px;
                width: 100%;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid var(--ink-200);
                border-radius: 32px;
                box-shadow: 0 30px 70px rgba(23, 20, 21, 0.12);
                padding: 40px;
                display: grid;
                gap: 20px;
                z-index: 1;
                animation: floatUp 1s ease forwards;
            }

            .badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 999px;
                border: 1px solid rgba(207, 199, 195, 0.4);
                background: rgba(248, 245, 240, 0.9);
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.3em;
                color: var(--ink-500);
                font-weight: 600;
            }

            .title {
                font-size: clamp(2.2rem, 4vw, 3.4rem);
                line-height: 1.05;
                margin: 0;
            }

            .subtitle {
                color: var(--ink-600);
                font-size: 1rem;
                margin: 0;
                max-width: 520px;
            }

            .icon {
                width: 56px;
                height: 56px;
                border-radius: 16px;
                display: grid;
                place-items: center;
                background: rgba(23, 20, 21, 0.08);
                color: var(--ink-900);
                font-weight: 700;
                font-size: 22px;
            }

            .timer {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 18px;
                border-radius: 16px;
                background: var(--sand-50);
                border: 1px solid var(--ink-200);
                font-size: 14px;
                color: var(--ink-700);
                width: fit-content;
            }

            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }

            .btn {
                border-radius: 999px;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 600;
                border: 1px solid var(--ink-300);
                background: transparent;
                color: var(--ink-700);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn.primary {
                background: var(--ink-900);
                color: #fff;
                border-color: var(--ink-900);
            }

            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 24px rgba(23, 20, 21, 0.12);
            }

            .muted {
                color: var(--ink-500);
                font-size: 13px;
            }

            .icon svg {
                animation: pulse 2.6s ease-in-out infinite;
            }

            .aurora.one {
                animation: drift 12s ease-in-out infinite;
            }

            .aurora.two {
                animation: drift 14s ease-in-out infinite reverse;
            }

            @keyframes floatUp {
                0% { opacity: 0; transform: translateY(18px); }
                100% { opacity: 1; transform: translateY(0); }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.08); opacity: 1; }
            }

            @keyframes drift {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(18px); }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="aurora one"></div>
            <div class="aurora two"></div>
            <div class="grid-bg"></div>

            <div class="card">
                <span class="badge">Error 429</span>
                <div class="icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 3l9 16H3z"></path>
                        <path d="M12 9v5"></path>
                        <path d="M12 17h.01"></path>
                    </svg>
                </div>
                <h1 class="title font-display">Demasiadas solicitudes.</h1>
                <p class="subtitle">
                    Detectamos demasiadas acciones en poco tiempo. Espera unos segundos y vuelve a intentarlo.
                    Te redirigiremos en <strong><span id="countdown">30</span></strong> segundos.
                </p>
                <div class="timer">
                    <span>Reintentando en breve...</span>
                </div>
                <div class="actions">
                    <button class="btn primary" type="button" id="backNow">Volver ahora</button>
                    <button class="btn" type="button" id="goDemo">Solicitar demo</button>
                </div>
                <p class="muted">Si el problema persiste, intenta más tarde.</p>
            </div>
        </div>

        <script>
            (function () {
                var seconds = 30;
                var countdown = document.getElementById('countdown');
                var backNow = document.getElementById('backNow');
                var goDemo = document.getElementById('goDemo');

                function goBack() {
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = '/';
                    }
                }

                var timer = setInterval(function () {
                    seconds -= 1;
                    if (seconds < 0) {
                        clearInterval(timer);
                        goBack();
                        return;
                    }
                    countdown.textContent = seconds;
                }, 1000);

                backNow.addEventListener('click', function () {
                    clearInterval(timer);
                    goBack();
                });

                goDemo.addEventListener('click', function () {
                    clearInterval(timer);
                    window.location.href = '/#demo';
                });
            })();
        </script>
    </body>
</html>
