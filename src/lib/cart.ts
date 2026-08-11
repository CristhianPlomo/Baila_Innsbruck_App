export type CourseCartItem = {
  id: string;
  courseId: string;
  courseName: string;
  styleId?: string;
  styleName?: string;
  levelId: string;
  levelName: string;
  levelDescription?: string | null;
  details?: {
    teacher: string;
    day: string;
    time: string;
    duration: string;
    address: string;
    content: string[];
  };
  amount?: number | null;
  currency?: string;
};

const storageKey = "baila-course-cart";

export function readCourseCart(): CourseCartItem[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCourseCart(items: CourseCartItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}
