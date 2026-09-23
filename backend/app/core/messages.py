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

# --- Task catalogue ---
VALIDATION_QUERY = "Проверьте параметры запроса"
SORT = "Допустимо: rating, date, responses"
PAGE = "Номер страницы — целое число от 1"
TASK_NOT_FOUND = "Задача не найдена"


def unknown_industry(code: str) -> str:
    return f"Неизвестная отрасль: {code}"


def unknown_level(code: str) -> str:
    return f"Неизвестный уровень: {code}"


# --- Card builder ---
INVALID_STATUS = "Действие недоступно в текущем статусе задачи"
ROUND_LIMIT_REACHED = "Лимит раундов уточнения исчерпан"
ROUND_NOT_ANSWERED = "Сначала ответьте на вопросы текущего раунда"
CARD_NOT_CONFIRMED = "Сначала подтвердите карточку"
DRAFT_TEXT = "Описание: от 50 до 3000 символов"
ANSWERS_INCOMPLETE = "Передайте ответы на все вопросы раунда"
ANSWER_TOO_LONG = "Ответ: до 1000 символов"
TITLE_TOO_LONG = "До 120 символов"
TITLE_REQUIRED = "Заполните название"
FIELD_TOO_LONG = "До 2000 символов"
NEED_REQUIRED = "Заполните потребность"


# --- Teams and proposals ---
TEAM_NOT_FOUND = "Команда не найдена"
MEMBER_NOT_FOUND = "Участник не найден"
PROPOSAL_NOT_FOUND = "Отклик не найден"
TEAM_FULL = "В команде уже 5 участников"
CAPTAIN_CANNOT_LEAVE = "Капитан не может покинуть команду"
PROPOSAL_EXISTS = "У команды уже есть активный отклик на эту задачу"
PROPOSAL_INVALID_STATUS = "Отклик уже рассмотрен или отозван"

TEAM_NAME = "Название: от 2 до 60 символов"
TEAM_NAME_TAKEN = "Команда с таким названием уже есть"
STUDENT_NOT_FOUND = "Студент с таким email не найден"
STUDENT_ALREADY_IN_TEAM = "Студент уже в команде"
NOT_CAPTAIN = "Выберите команду, в которой вы капитан"
IDEA = "Идея: от 20 до 2000 символов"
PLAN = "План: от 20 до 3000 символов"
DURATION_WEEKS = "Срок: целое число недель от 1 до 52"
PROTOTYPE_URL = "Ссылка должна начинаться с http:// или https://"
PROTOTYPE_URL_LONG = "Ссылка: до 500 символов"


# --- Selection and milestones ---
MILESTONE_NOT_FOUND = "Этап не найден"
ALREADY_CONFIRMED = "Этап уже подтверждён"
DECISION_TAKEN = "Решение по отклику уже принято или отклик отозван"
MILESTONES_ONLY_SELECTED = "Этапы доступны только для выбранной команды"
COMMENT_LONG = "Комментарий: до 1000 символов"
MILESTONE_TITLE = "Название этапа: от 3 до 200 символов"
