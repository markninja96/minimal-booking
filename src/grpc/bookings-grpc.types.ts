export type CreateBookingGrpcRequest = {
  providerId: string;
  customerName: string;
  customerEmail: string;
  startTime: string;
  endTime: string;
};

export type BookingGrpcResponse = {
  id: string;
  providerId: string;
  customerName: string;
  customerEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
