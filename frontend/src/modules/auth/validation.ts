import type {
  LoginInput,
  RegisterBusinessInput,
  RegisterStudentInput,
} from "./types.ts";

export const validationMessages = {
  emailRequired: "Введите email",
  passwordRequired: "Введите пароль",
  emailInvalid: "Неверный формат email",
  passwordInvalid: "Минимум 8 символов, хотя бы одна буква и одна цифра",
  companyNameInvalid: "Название компании: от 2 до 200 символов",
  contactNameInvalid: "Имя контактного лица: от 2 до 100 символов",
  contactPhoneInvalid: "Телефон: от 10 до 15 цифр, можно с + в начале",
  nameInvalid: "Имя: от 2 до 100 символов",
  tagsInvalid: "До 20 тегов, каждый до 50 символов",
} as const;

export type ValidationKey = keyof typeof validationMessages;
export type ValidationErrors<T> = Partial<Record<keyof T, ValidationKey>>;
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 50;

export const normalizePhone = (value: string) => value.replace(/[\s()\-]/g, "");
const validLength = (value: string, min: number, max: number) =>
  value.trim().length >= min && value.trim().length <= max;

const validateCredentials = (
  input: LoginInput
): ValidationErrors<LoginInput> => {
  const errors: ValidationErrors<LoginInput> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = "emailInvalid";
  if (
    input.password.length < 8 ||
    !/\p{L}/u.test(input.password) ||
    !/[0-9]/.test(input.password)
  ) {
    errors.password = "passwordInvalid";
  }
  return errors;
};

export const validateLogin = (
  input: LoginInput
): ValidationErrors<LoginInput> => {
  const errors: ValidationErrors<LoginInput> = {};
  if (!input.email.trim()) errors.email = "emailRequired";
  if (!input.password) errors.password = "passwordRequired";
  return errors;
};

export const validateBusiness = (
  input: RegisterBusinessInput
): ValidationErrors<RegisterBusinessInput> => {
  const errors: ValidationErrors<RegisterBusinessInput> =
    validateCredentials(input);
  if (!validLength(input.companyName, 2, 200))
    errors.companyName = "companyNameInvalid";
  if (!validLength(input.contactName, 2, 100))
    errors.contactName = "contactNameInvalid";
  if (!/^\+?\d{10,15}$/.test(normalizePhone(input.contactPhone)))
    errors.contactPhone = "contactPhoneInvalid";
  return errors;
};

export const validTags = (tags: string[]) =>
  tags.length <= MAX_TAGS &&
  tags.every((tag) => validLength(tag, 1, MAX_TAG_LENGTH));

export const validateStudent = (
  input: RegisterStudentInput
): ValidationErrors<RegisterStudentInput> => {
  const errors: ValidationErrors<RegisterStudentInput> =
    validateCredentials(input);
  if (!validLength(input.name, 2, 100)) errors.name = "nameInvalid";
  if (!validTags(input.skills)) errors.skills = "tagsInvalid";
  if (!validTags(input.technologies)) errors.technologies = "tagsInvalid";
  return errors;
};

export const normalizeBusinessInput = (
  input: RegisterBusinessInput
): RegisterBusinessInput => ({
  ...input,
  email: input.email.trim(),
  companyName: input.companyName.trim(),
  contactName: input.contactName.trim(),
  contactPhone: normalizePhone(input.contactPhone),
});

export const normalizeStudentInput = (
  input: RegisterStudentInput
): RegisterStudentInput => ({
  ...input,
  email: input.email.trim(),
  name: input.name.trim(),
  skills: input.skills.map((tag) => tag.trim()),
  technologies: input.technologies.map((tag) => tag.trim()),
});

export const addTag = (
  tags: string[],
  draft: string
): { tags: string[]; error?: ValidationKey } => {
  const tag = draft.trim();
  if (!tag || tags.some((item) => item.toLowerCase() === tag.toLowerCase()))
    return { tags };
  if (tag.length > MAX_TAG_LENGTH || tags.length >= MAX_TAGS)
    return { tags, error: "tagsInvalid" };
  return { tags: [...tags, tag] };
};
