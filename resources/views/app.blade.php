<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- CSRF para formularios Inertia --}}
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {{-- SEO base --}}
    <meta name="description" content="{{ config('app.description', 'Inventario web rapido y seguro para gestionar existencias, ventas y reportes en tiempo real.') }}">
    <meta name="keywords" content="inventario, inventory, control de stock, ventas, bodegas, ERP, Laravel, React, Inertia">
    <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
    <link rel="canonical" href="{{ url()->current() }}">
    <meta name="theme-color" content="#0f172a">

    {{-- Open Graph / Facebook --}}
    <meta property="og:site_name" content="{{ config('app.name', 'Laravel') }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ config('app.name', 'Laravel') }} - Control de inventario">
    <meta property="og:description" content="{{ config('app.description', 'Inventario web rapido y seguro para gestionar existencias, ventas y reportes en tiempo real.') }}">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:image" content="{{ asset('DealerManiaOG.jpg') }}">

    {{-- Twitter --}}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ config('app.name', 'Laravel') }} - Control de inventario">
    <meta name="twitter:description" content="{{ config('app.description', 'Inventario web rapido y seguro para gestionar existencias, ventas y reportes en tiempo real.') }}">
    <meta name="twitter:image" content="{{ asset('DealerManiaOG.jpg') }}">

    {{-- Datos estructurados --}}
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "{{ config('app.name', 'Laravel') }}",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "url": "{{ config('app.url') ?? url('/') }}",
        "description": "{{ config('app.description', 'Inventario web rapido y seguro para gestionar existencias, ventas y reportes en tiempo real.') }}",
        "image": "{{ asset('DealerManiaOG.jpg') }}"
      }
    </script>

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Scripts -->
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
    @inertiaHead
  </head>
  <body class="font-sans antialiased">
    @inertia
  </body>
</html>
