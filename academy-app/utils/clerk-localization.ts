export interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
  meta: Record<string, string>;
}

export const clerkLocalization = {
  already_a_member_in_organization: '{{email}} ya es miembro de la organización.',
  avatar_file_size_exceeded:
    'El tamaño del archivo excede el límite máximo de 10MB. Por favor, elige un archivo más pequeño.',
  avatar_file_type_invalid:
    'Tipo de archivo no soportado. Por favor, sube una imagen JPG, PNG, GIF o WEBP.',
  captcha_invalid: 'Captcha inválido.',
  captcha_unavailable:
    'Registro fallido debido a validación de bot fallida. Por favor, actualiza la página para intentar de nuevo o contacta a soporte para más ayuda.',
  form_code_incorrect: 'Código incorrecto.',
  form_email_address_blocked: 'Esta dirección de correo electrónico ha sido bloqueada.',
  form_identifier_exists__email_address:
    'Esta dirección de correo electrónico ya está en uso.',
  form_identifier_exists__phone_number: 'Este número de teléfono ya está en uso.',
  form_identifier_exists__username: 'Este nombre de usuario ya está en uso.',
  form_identifier_not_found: 'No se encontró ninguna cuenta con este identificador.',
  form_new_password_matches_current:
    'La nueva contraseña no puede ser la misma que la contraseña actual.',
  form_param_format_invalid: 'Formato inválido.',
  form_param_format_invalid__email_address: 'Formato de correo electrónico inválido.',
  form_param_format_invalid__phone_number: 'Formato de número de teléfono inválido.',
  form_param_max_length_exceeded__first_name: 'El nombre es demasiado largo.',
  form_param_max_length_exceeded__last_name: 'El apellido es demasiado largo.',
  form_param_max_length_exceeded__name: 'El nombre es demasiado largo.',
  form_param_nil: 'Este campo es requerido.',
  form_param_type_invalid: 'Tipo de valor inválido.',
  form_param_type_invalid__email_address:
    'La dirección de correo electrónico no es válida.',
  form_param_type_invalid__phone_number: 'El número de teléfono no es válido.',
  form_param_value_invalid: 'Valor inválido.',
  form_password_compromised__sign_in:
    'Tu contraseña puede estar comprometida. Por seguridad, restablécela.',
  form_password_incorrect: 'Contraseña incorrecta.',
  form_password_length_too_short:
    'Tu contraseña es demasiado corta. Debe tener al menos 8 caracteres.',
  form_password_not_strong_enough: 'Tu contraseña no es lo suficientemente fuerte.',
  form_password_or_identifier_incorrect: 'Contraseña o identificador incorrecto.',
  form_password_pwned:
    'Esta contraseña ha sido encontrada como parte de una filtración y no puede ser usada, por favor intenta con otra contraseña.',
  form_password_pwned__sign_in:
    'Esta contraseña ha sido encontrada como parte de una filtración y no puede ser usada, por favor restablece tu contraseña.',
  form_password_size_in_bytes_exceeded:
    'La contraseña excede el tamaño máximo permitido.',
  form_password_untrusted__sign_in:
    'Tu contraseña puede estar comprometida. Para proteger tu cuenta, por favor continúa con un método alternativo de inicio de sesión. Se te pedirá restablecer tu contraseña después de iniciar sesión.',
  form_password_validation_failed: 'La validación de la contraseña falló.',
  form_username_invalid_character:
    'El nombre de usuario contiene caracteres no permitidos.',
  form_username_invalid_length:
    'Tu nombre de usuario debe tener entre {{min_length}} y {{max_length}} caracteres.',
  form_username_needs_non_number_char:
    'Tu nombre de usuario debe contener al menos un carácter no numérico.',
  identification_deletion_failed: 'No se pudo eliminar el método de identificación.',
  not_allowed_access: 'No tienes permiso para acceder a este recurso.',
  organization_domain_blocked: 'Este dominio de organización ha sido bloqueado.',
  organization_domain_common: 'Este dominio es demasiado común y no puede ser usado.',
  organization_domain_exists_for_enterprise_connection:
    'Este dominio ya existe para una conexión empresarial.',
  organization_membership_quota_exceeded:
    'Se ha alcanzado el límite de miembros de la organización.',
  organization_minimum_permissions_needed:
    'No tienes los permisos mínimos necesarios para realizar esta acción.',
  organization_not_found_or_unauthorized:
    'Ya no eres miembro de esta organización. Por favor, elige o crea otra.',
  organization_not_found_or_unauthorized_with_create_organization_disabled:
    'Ya no eres miembro de esta organización. Por favor, elige otra.',
  passkey_already_exists: 'Ya hay una passkey registrada con este dispositivo.',
  passkey_not_supported: 'Las passkeys no son compatibles con este dispositivo.',
  passkey_pa_not_supported:
    'El registro requiere un autenticador de plataforma pero el dispositivo no lo soporta.',
  passkey_registration_cancelled: 'El registro de passkey fue cancelado o expiró.',
  passkey_retrieval_cancelled: 'La verificación de passkey fue cancelada o expiró.',
  verification_expired: 'Esta código ha expirado.',
  passwordComplexity: {
    maximumLength: 'menos de {{length}} caracteres',
    minimumLength: '{{length}} o más caracteres',
    requireLowercase: 'una letra minúscula',
    requireNumbers: 'un número',
    requireSpecialCharacter: 'un carácter especial',
    requireUppercase: 'una letra mayúscula',
    sentencePrefix: 'Tu contraseña debe contener',
  },
  phone_number_exists: 'Este número de teléfono ya está en uso.',
  session_exists: 'Ya tienes una sesión activa.',
  web3_missing_identifier:
    'No se puede encontrar una extensión de Web3 Wallet. Por favor, instala una para continuar.',
  web3_signature_request_rejected:
    'Has rechazado la solicitud de firma. Por favor, intenta de nuevo para continuar.',
  web3_solana_signature_generation_failed:
    'Ocurrió un error al generar la firma. Por favor, intenta de nuevo para continuar.',
  zxcvbn: {
    couldBeStronger:
      'Tu contraseña funciona, pero podría ser más fuerte. Intenta agregar más caracteres.',
    goodPassword: 'Tu contraseña cumple con todos los requisitos necesarios.',
    notEnough: 'Tu contraseña no es lo suficientemente fuerte.',
    suggestions: {
      allUppercase: 'Capitaliza algunas letras, pero no todas.',
      anotherWord: 'Agrega más palabras que sean menos comunes.',
      associatedYears: 'Evita años que estén asociados contigo.',
      capitalization: 'Capitaliza más que solo la primera letra.',
      dates: 'Evita fechas y años que estén asociados contigo.',
      l33t: "Evita sustituciones predecibles de letras como '@' por 'a'.",
      longerKeyboardPattern:
        'Usa patrones de teclado más largos y cambia la dirección de escritura varias veces.',
      noNeed:
        'Puedes crear contraseñas fuertes sin usar símbolos, números o letras mayúsculas.',
      pwned: 'Si usas esta contraseña en otro lugar, deberías cambiarla.',
      recentYears: 'Evita años recientes.',
      repeated: 'Evita palabras y caracteres repetidos.',
      reverseWords: 'Evita deletreos invertidos de palabras comunes.',
      sequences: 'Evita secuencias de caracteres comunes.',
      useWords: 'Usa múltiples palabras, pero evita frases comunes.',
    },
    warnings: {
      common: 'Esta es una contraseña comúnmente usada.',
      commonNames: 'Los nombres y apellidos comunes son fáciles de adivinar.',
      dates: 'Las fechas son fáciles de adivinar.',
      extendedRepeat:
        'Los patrones de caracteres repetidos como "abcabcabc" son fáciles de adivinar.',
      keyPattern: 'Los patrones cortos de teclado son fáciles de adivinar.',
      namesByThemselves: 'Los nombres o apellidos solos son fáciles de adivinar.',
      pwned: 'Tu contraseña fue expuesta en una filtración de datos en Internet.',
      recentYears: 'Los años recientes son fáciles de adivinar.',
      sequences:
        'Las secuencias de caracteres comunes como "abc" son fáciles de adivinar.',
      similarToCommon: 'Esto es similar a una contraseña comúnmente usada.',
      simpleRepeat: 'Los caracteres repetidos como "aaa" son fáciles de adivinar.',
      straightRow: 'Las filas rectas de teclas en tu teclado son fáciles de adivinar.',
      topHundred: 'Esta es una contraseña frecuentemente usada.',
      topTen: 'Esta es una contraseña muy usada.',
      userInputs: 'No debería haber datos personales o relacionados con la página.',
      wordByItself: 'Las palabras solas son fáciles de adivinar.',
    },
  },
};

export const handleClerkErrors = (errors: ClerkError[]): string => {
  if (!errors || errors.length === 0) {
    return 'Ocurrió un error inesperado.';
  }

  const error = errors[0];
  const errorCode = error.code;

  // Intentar buscar con código exacto, luego con code__paramName
  const keysToTry: string[] = [errorCode];
  if (error.meta?.paramName) {
    keysToTry.unshift(`${errorCode}__${error.meta.paramName}`);
  }

  for (const key of keysToTry) {
    const errorMessage = clerkLocalization[key as keyof typeof clerkLocalization];

    // Si el mensaje es un objeto (como passwordComplexity o zxcvbn), manejar de forma especial
    if (typeof errorMessage === 'object' && errorMessage !== null) {
      return 'Error de validación.';
    }

    // Si encontramos el mensaje traducido, reemplazar los placeholders
    if (typeof errorMessage === 'string') {
      let message = errorMessage;

      // Reemplazar placeholders como {{email}}, {{length}}, {{min_length}}, {{max_length}}
      if (error.meta) {
        Object.keys(error.meta).forEach((k) => {
          message = message.replace(`{{${k}}}`, error.meta[k]);
        });
      }

      return message;
    }
  }

  // Si no encontramos el mensaje, retornar un mensaje genérico
  return error.message || 'Ocurrió un error. Por favor, intenta de nuevo.';
};
