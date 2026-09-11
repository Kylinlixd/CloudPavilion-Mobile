export type Id = number;
export type User = {
  id: Id;
  username: string;
  email: string;
  nickname: string;
  real_name: string;
  avatar: string | null;
};
export type Family = {
  id: Id;
  name: string;
  description: string;
  member_count: number;
  public_code: string;
  allow_code_join: boolean;
  my_role?: "owner" | "admin" | "member" | "reader" | "viewer" | null;
};
export type Membership = {
  id: Id;
  family: Id;
  user: Id;
  user_detail: User;
  role: "owner" | "admin" | "member" | "reader" | "viewer";
  is_active: boolean;
  joined_at: string;
};
export type Book = {
  id: Id;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  cover: string | null;
  cover_url: string;
  copy_count: number;
  publisher: string;
  publish_date: string | null;
};
export type BookCopy = {
  id: Id;
  book: Id;
  book_title: string;
  family: Id;
  barcode: string;
  status: string;
  notes: string;
  acquired_at: string | null;
};
export type Loan = {
  id: Id;
  family: Id;
  copy: Id;
  book_id?: Id;
  book_title: string;
  author?: string;
  cover_url?: string;
  borrower: Id;
  borrower_name: string;
  status: string;
  is_active: boolean;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  renewed_count: number;
  can_renew?: boolean;
  can_return?: boolean;
  can_reserve?: boolean;
  action_reason?: string;
};
export type Reservation = {
  id: Id;
  family: Id;
  copy: Id;
  book_id: Id;
  user: Id;
  status: string;
  book_title: string;
  author: string;
  cover_url: string;
  barcode: string | null;
  queue_position: number | null;
  created_at: string;
  updated_at: string;
};
export type Notification = {
  id: Id;
  family: Id;
  recipient: Id;
  notification_type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};
export type Dashboard = {
  books: { titles: number; copies: number; by_status: Record<string, number> };
  popular_books: { id: Id; title: string; borrow_count: number }[];
};
export type Recommendation = {
  id: Id;
  title: string;
  author: string;
  category: string;
  copy_count: number;
};
export type AnnualReport = {
  year: number;
  total_loans: number;
  monthly_distribution: { month: number; count: number }[];
  categories: { copy__book__category: string; count: number }[];
};
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
