// Deliberately does nothing but exist — Chrome/Android's install-banner
// criteria require an active service worker with a fetch handler, but this
// app is entirely live data (bookings, schedules, balances), so caching any
// of it would mean showing a student or admin something stale or wrong.
// Every request is just passed straight through to the network.
self.addEventListener("fetch", () => {})
