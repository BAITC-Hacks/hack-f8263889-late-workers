import type { Gender, User, UserStatus } from "@/modules/users";

/**
 * 57 users — the `total` the API contract shows in its example response.
 * Built from two name lists of coprime lengths (19 × 20), so every first/last
 * name pair inside the first 57 rows is unique and so is the derived email.
 */
const FIRST_NAMES: { name: string; slug: string; gender: Gender }[] = [
  { name: "Иван", slug: "ivan", gender: "male" },
  { name: "Мария", slug: "maria", gender: "female" },
  { name: "Пётр", slug: "petr", gender: "male" },
  { name: "Анна", slug: "anna", gender: "female" },
  { name: "Сергей", slug: "sergey", gender: "male" },
  { name: "Ольга", slug: "olga", gender: "female" },
  { name: "Дмитрий", slug: "dmitry", gender: "male" },
  { name: "Елена", slug: "elena", gender: "female" },
  { name: "Алексей", slug: "alexey", gender: "male" },
  { name: "Наталья", slug: "natalia", gender: "female" },
  { name: "Артём", slug: "artem", gender: "male" },
  { name: "Ксения", slug: "ksenia", gender: "female" },
  { name: "Николай", slug: "nikolay", gender: "male" },
  { name: "Татьяна", slug: "tatiana", gender: "female" },
  { name: "Михаил", slug: "mikhail", gender: "male" },
  { name: "Ирина", slug: "irina", gender: "female" },
  { name: "Роман", slug: "roman", gender: "male" },
  { name: "Светлана", slug: "svetlana", gender: "female" },
  { name: "Владимир", slug: "vladimir", gender: "male" },
];

const LAST_NAMES: { name: string; slug: string }[] = [
  { name: "Петров", slug: "petrov" },
  { name: "Иванов", slug: "ivanov" },
  { name: "Смирнов", slug: "smirnov" },
  { name: "Кузнецов", slug: "kuznetsov" },
  { name: "Соколов", slug: "sokolov" },
  { name: "Попов", slug: "popov" },
  { name: "Лебедев", slug: "lebedev" },
  { name: "Новиков", slug: "novikov" },
  { name: "Морозов", slug: "morozov" },
  { name: "Волков", slug: "volkov" },
  { name: "Зайцев", slug: "zaytsev" },
  { name: "Павлов", slug: "pavlov" },
  { name: "Семёнов", slug: "semenov" },
  { name: "Голубев", slug: "golubev" },
  { name: "Виноградов", slug: "vinogradov" },
  { name: "Богданов", slug: "bogdanov" },
  { name: "Воробьёв", slug: "vorobyev" },
  { name: "Фёдоров", slug: "fedorov" },
  { name: "Михайлов", slug: "mikhaylov" },
  { name: "Беляев", slug: "belyaev" },
];

export const USERS_TOTAL = 57;

const BASE_TIME = Date.UTC(2026, 8, 23, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

const buildUser = (index: number): User => {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 7) % LAST_NAMES.length];
  const isFemaleName = first.gender === "female";
  // Every third row is "unknown" regardless of the name it was built from.
  const gender: Gender = index % 3 === 2 ? "unknown" : first.gender;
  const status: UserStatus = index % 4 === 1 ? "blocked" : "active";

  return {
    id: index + 1,
    firstName: first.name,
    lastName: isFemaleName ? `${last.name}а` : last.name,
    email: `${first.slug}.${last.slug}@example.com`,
    phone: `+7701${1234567 + index * 1111}`,
    gender,
    status,
    createdAt: new Date(
      BASE_TIME - index * DAY - index * 37 * 60 * 1000
    ).toISOString(),
  };
};

export const usersData: User[] = Array.from(
  { length: USERS_TOTAL },
  (_, index) => buildUser(index)
);
