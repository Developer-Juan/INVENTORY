<?php

return [
    'markups' => [
        'menu' => [
            'inline_keyboard' => [
                [
                    ['text' => 'Soporte', 'callback_data' => 'soporte'],
                    ['text' => 'Estado', 'callback_data' => 'estado'],
                ],
                [
                    ['text' => 'Hablar con humano', 'callback_data' => 'agente'],
                    ['text' => 'Ayuda', 'callback_data' => 'ayuda'],
                ],
            ],
        ],
        'menu_info' => [
            'inline_keyboard' => [
                [
                    ['text' => 'Problemas al iniciar sesion', 'callback_data' => 'problemas_login'],
                    ['text' => 'Problemas al crear cuenta', 'callback_data' => 'problemas_cuenta'],
                ],
                [
                    ['text' => 'Hablar con humano', 'callback_data' => 'agente'],
                    ['text' => 'Ayuda', 'callback_data' => 'ayuda'],
                ],
                [
                    ['text' => 'Mas info', 'url' => config('services.telegram.support_url')],
                ],
            ],
        ],
        'menu_estado' => [
            'inline_keyboard' => [
                [
                    ['text' => 'Ver estado del ticket', 'callback_data' => 'ver_estado_ticket'],
                ],
                [
                    ['text' => 'Ayuda', 'callback_data' => 'ayuda'],
                ],
            ],
        ],
    ],

    // Diccionario de intents
    'replies' => [
        'start' => [
            'text' => "Hola! Soy el bot de soporte.\nElige una opcion:",
            'markup' => 'menu',
        ],
        'ayuda' => [
            'text' => "Opciones disponibles:",
            'markup' => 'menu',
        ],
        'soporte' => [
            'text' => 'Cuentame tu problema en una sola frase y lo escalo al equipo.',
            'markup' => 'menu_info',
        ],
        'estado' => [
            'text' => 'Primero valida tu correo. Si tienes numero de ticket, envialo y luego tu correo.',
            'markup' => 'menu_estado',
            'action' => 'start_status_flow',
        ],
        'agente' => [
            'text' => 'Perfecto. Para conectarte con un humano necesito validar tu correo.',
            'markup' => 'menu',
            'action' => 'start_human_flow',
        ],
        'email_request' => [
            'text' => 'Escribe tu correo registrado:',
            'markup' => 'menu',
        ],
        'email_invalid' => [
            'text' => 'Correo invalido. Intenta de nuevo ⚠️',
            'markup' => 'menu',
        ],
        'email_not_found' => [
            'text' => 'No encontramos ese correo en nuestra base de datos.',
            'markup' => 'menu',
        ],
        'email_welcome' => [
            'text' => 'Bienvenido <b>{name}</b>. Hemos validado tu cuenta ({email}).',
            'markup' => 'menu',
        ],
        'subject_request' => [
            'text' => 'Escribe el asunto del ticket:',
            'markup' => 'menu',
        ],
        'description_request' => [
            'text' => 'Describe el asunto con mas detalle:',
            'markup' => 'menu',
        ],
        'ticket_created' => [
            'text' => "Listo ✅ Ticket #{ticket_id}\nContacto: {admin_info}",
            'markup' => 'menu',
        ],
        'chat_closed' => [
            'text' => 'Chat finalizado por inactividad. Si necesitas ayuda, inicia de nuevo.',
            'markup' => 'menu',
        ],
        'ver_estado_ticket' => [
            'text' => 'Vamos a validar tu ticket.',
            'markup' => 'menu_estado',
            'action' => 'start_status_flow',
        ],
        'status_request' => [
            'text' => 'Escribe tu correo para validar el ticket:',
            'markup' => 'menu_estado',
        ],
        'status_email_request' => [
            'text' => 'Escribe tu correo para validar el ticket:',
            'markup' => 'menu_estado',
        ],
        'status_not_found' => [
            'text' => 'No encontramos un ticket con esa informacion.',
            'markup' => 'menu',
        ],
        'status_list' => [
            'text' => 'Aqui tienes el listado:',
            'markup' => 'menu',
        ],
        'status_found' => [
            'text' => "Ticket #{ticket_id}\nEstado: {status}\nAsunto: {subject}\nUltimo mensaje: {last_message_at}",
            'markup' => 'menu',
        ],
        'default' => [
            'text' => 'No entendi. Usa los botones.',
            'markup' => 'menu',
        ],
    ],
];
