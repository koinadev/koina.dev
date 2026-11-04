export interface NewSubmission {
  id: string;
  form: string;
  name: string;
  email: string;
  message: string;
}

export interface SubscriberListRow {
  email: string;
  locale: string;
  createdAt: Date;
  confirmedAt: Date | null;
}
