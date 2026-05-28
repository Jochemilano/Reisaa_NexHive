<?php

class JWTHelper {
    /**
     * Firma y genera un token JWT (HS256) nativo
     *
     * @param array $payload Datos del usuario a encriptar (ej. ["id" => 12])
     * @param int $expiry Duración del token en segundos (por defecto 24 horas = 86400s)
     * @return string Token firmado
     */
    public static function sign($payload, $expiry = 86400) {
        $secret = getenv('JWT_SECRET') ?: 'SECRETO_SUPER_SEGURO';

        // Estructurar cabecera estándar
        $header = [
            "alg" => "HS256",
            "typ" => "JWT"
        ];

        // Añadir marcas de tiempo obligatorias para seguridad
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiry;

        // Codificar a JSON y luego a Base64Url
        $headerEncoded  = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        // Generar firma HMAC-SHA256
        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$headerEncoded.$payloadEncoded.$signatureEncoded";
    }

    /**
     * Verifica y decodifica un token JWT (HS256)
     *
     * @param string $token Token recibido del cliente
     * @return array|null Retorna el payload decodificado si es válido, o null si expiró/inválido
     */
    public static function verify($token) {
        $secret = getenv('JWT_SECRET') ?: 'SECRETO_SUPER_SEGURO';

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null; // Formato de token inválido
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        // Validar la firma
        $expectedSignature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);
        $expectedSignatureEncoded = self::base64UrlEncode($expectedSignature);

        if (!hash_equals($expectedSignatureEncoded, $signatureEncoded)) {
            return null; // La firma no coincide (manipulación)
        }

        // Decodificar el payload
        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);
        if (!$payload) {
            return null; // JSON corrupto
        }

        // Comprobar expiración
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Token expirado
        }

        return $payload;
    }

    // ──────────────────────────────────────────────────────────────────────
    // MÉTODOS DE SOPORTE PARA BASE64URL
    // ──────────────────────────────────────────────────────────────────────

    private static function base64UrlEncode($data) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }
}
