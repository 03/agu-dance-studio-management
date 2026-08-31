-- Allow a student to be booked into the same class occurrence more than
-- once (bringing a friend along under their own account, "接龙两次") —
-- drop the compound-unique constraint and replace it with a plain index
-- for the same (studentId, sessionId, date) lookups the app still does.
DROP INDEX "bookings_studentId_sessionId_date_key";
CREATE INDEX "bookings_studentId_sessionId_date_idx" ON "bookings"("studentId", "sessionId", "date");
