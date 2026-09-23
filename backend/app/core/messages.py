"""User-facing messages for the public API contract, in one place.

The contract is Russian-facing, so these strings are part of the API surface:
the frontend renders them verbatim and tests assert them literally.
"""

# --- Error envelope messages ---
VALIDATION = "Проверьте поля формы"
EMAIL_TAKEN = "Пользователь с таким email уже зарегистрирован"
INVALID_CREDENTIALS = "Неверный email или пароль"
UNAUTHORIZED = "Требуется вход"
FORBIDDEN = "Недостаточно прав"

# --- Per-field validation messages ---
# Each field has exactly one message, whichever of its rules failed.
EMAIL_FORMAT = "Неверный формат email"
PASSWORD_WEAK = "Минимум 8 символов, хотя бы одна буква и одна цифра"
COMPANY_NAME = "Название компании: от 2 до 200 символов"
CONTACT_NAME = "Имя контактного лица: от 2 до 100 символов"
CONTACT_PHONE = "Телефон: от 10 до 15 цифр, можно с + в начале"
NAME = "Имя: от 2 до 100 символов"
TAGS = "До 20 тегов, каждый до 50 символов"

# --- Login-only messages (the spec asks for "fill this in", not "this is malformed") ---
EMAIL_REQUIRED = "Введите email"
PASSWORD_REQUIRED = "Введите пароль"
