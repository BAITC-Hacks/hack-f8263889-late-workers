export type UserRole = "business" | "student";

type UserBase = { id: number; email: string; createdAt: string };

export type BusinessUser = UserBase & {
  role: "business";
  business: {
    id: number;
    companyName: string;
    contactName: string;
    contactPhone: string;
  };
  student: null;
};

export type StudentUser = UserBase & {
  role: "student";
  business: null;
  student: {
    id: number;
    name: string;
    skills: string[];
    technologies: string[];
  };
};

export type User = BusinessUser | StudentUser;
export type UserResponse = { user: User };
export type LoginInput = { email: string; password: string };
export type RegisterBusinessInput = LoginInput & {
  companyName: string;
  contactName: string;
  contactPhone: string;
};
export type RegisterStudentInput = LoginInput & {
  name: string;
  skills: string[];
  technologies: string[];
};
