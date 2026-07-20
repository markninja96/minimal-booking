export type BookingCreatedEvent = {
  id: string;
  providerId: string;
  customerName: string;
  customerEmail: string;
  startTime: string;
  endTime: string;
};
