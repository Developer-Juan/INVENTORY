@php
    $safe = nl2br(e($content ?? ''));
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Actualización</title>
</head>
<body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;background:#0f172a;color:#fff;">
                            <div style="font-size:16px;letter-spacing:0.08em;text-transform:uppercase;">Actualización</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 28px;font-size:14px;line-height:1.6;">
                            {!! $safe !!}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 28px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                            &copy; {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
