export interface NewEvent {
  id: string;
  kind: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  url: string | null;
}

export interface RsvpCountRow {
  eventId: string;
  going: number;
  me: boolean;
}
