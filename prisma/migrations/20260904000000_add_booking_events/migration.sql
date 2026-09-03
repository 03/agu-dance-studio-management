-- Append-only audit trail of 接龙 add/cancel activity per class occurrence —
-- powers 课时登记's roster dialog history view, which needs a chronological
-- log (including cancels, which Booking itself has no timestamp for) that
-- outlives any single Booking row's current state.
CREATE TYPE "BookingEventType" AS ENUM ('ADD', 'CANCEL');

CREATE TABLE "booking_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "BookingEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_events_sessionId_date_idx" ON "booking_events"("sessionId", "date");

ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
