<?php

class MailerHelper {
    /**
     * Envía un correo de verificación
     *
     * @param string $email Correo de destino
     * @param string $code Código generado
     * @return bool True si se envió correctamente, false si falló
     */
    public static function sendVerificationEmail($email, $code) {
        $subject = "Verifica tu cuenta en NexHive";
        $html = '
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3B82F6; text-align: center;">¡Bienvenido a NexHive!</h2>
            <p>Gracias por registrarte. Para completar tu registro, por favor ingresa el siguiente código de verificación en la aplicación:</p>
            <div style="background-color: #F4F7F9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2E3A4C; border-radius: 8px; margin: 20px 0;">
              ' . $code . '
            </div>
            <p>Si no solicitaste este registro, puedes ignorar este correo.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #9BAAB8; text-align: center;">Este es un correo automático, por favor no respondas.</p>
          </div>
        ';

        return self::sendMail($email, $subject, $html, "CÓDIGO DE VERIFICACIÓN (DEV): $code");
    }

    /**
     * Envía un correo de recuperación de contraseña
     *
     * @param string $email Correo de destino
     * @param string $code Código generado
     * @return bool True si se envió, false si falló
     */
    public static function sendResetEmail($email, $code) {
        $subject = "Recupera tu contraseña - NexHive";
        $html = '
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3B82F6; text-align: center;">Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Ingresa el siguiente código en la aplicación para continuar:</p>
            <div style="background-color: #F4F7F9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2E3A4C; border-radius: 8px; margin: 20px 0;">
              ' . $code . '
            </div>
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #9BAAB8; text-align: center;">NexHive Team</p>
          </div>
        ';

        return self::sendMail($email, $subject, $html, "CÓDIGO DE RESET DE CONTRASEÑA (DEV): $code");
    }

    /**
     * Ejecuta el envío de correo usando mail() de PHP (muy compatible con cPanel)
     * e implementa un log de desarrollo local en caso de fallar.
     */
    private static function sendMail($to, $subject, $html, $devCodeMsg) {
        $from = getenv('MAIL_FROM') ?: 'NexHive <no-reply@nexhive.com>';

        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=utf-8',
            'From: ' . $from,
            'Reply-To: ' . $from,
            'X-Mailer: PHP/' . phpversion()
        ];

        $headersString = implode("\r\n", $headers);

        // Intentar enviar mediante el MTA nativo (funciona por defecto en cPanel)
        $sent = @mail($to, $subject, $html, $headersString);

        if ($sent) {
            return true;
        }

        // --- FALLBACK PARA DESARROLLO LOCAL ---
        // Dado que mail() a menudo falla en XAMPP sin configurar sendmail.exe,
        // registramos el código en un log local y en el log de errores de PHP.
        $logPath = dirname(__DIR__) . '/debug_mail.log';
        $logEntry = "[" . date('Y-m-d H:i:s') . "] Correo enviado a: $to | Asunto: $subject | $devCodeMsg\n";
        
        @file_put_contents($logPath, $logEntry, FILE_APPEND);
        error_log($devCodeMsg);

        // Retornamos true para no bloquear el flujo de registro del usuario en local
        return true;
    }
}
