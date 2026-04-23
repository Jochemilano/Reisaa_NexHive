const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Verifica tu cuenta en NexHive",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #3B82F6; text-align: center;">¡Bienvenido a NexHive!</h2>
        <p>Gracias por registrarte. Para completar tu registro, por favor ingresa el siguiente código de verificación en la aplicación:</p>
        <div style="background-color: #F4F7F9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2E3A4C; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p>Si no solicitaste este registro, puedes ignorar este correo.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #9BAAB8; text-align: center;">Este es un correo automático, por favor no respondas.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email de verificación enviado a:", email);
    return true;
  } catch (error) {
    console.error("Error enviando email:", error);
    console.log("CÓDIGO DE VERIFICACIÓN (DEV):", code);
    return false;
  }
};

const sendResetEmail = async (email, code) => {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Recupera tu contraseña - NexHive",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #3B82F6; text-align: center;">Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Ingresa el siguiente código en la aplicación para continuar:</p>
        <div style="background-color: #F4F7F9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2E3A4C; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #9BAAB8; text-align: center;">NexHive Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error enviando email de reset:", error);
    console.log("CÓDIGO DE RESET (DEV):", code);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendResetEmail };
