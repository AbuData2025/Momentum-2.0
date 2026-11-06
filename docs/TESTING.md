# Release checklist

Run through this on every release. "Web" is the hosted site, "Android" is the Android Studio build.

## 1. Sign-in and data continuity
- [ ] Web: sign in with Google. Existing runs and plan appear.
- [ ] Android: sign in with the SAME Google account. The same runs and plan appear.
- [ ] Firebase console > Authentication > Users still lists ONE user for that account (same UID on both).
- [ ] Sign out and in again on both. Data is still there.

## 2. Run logging (each on Web and Android)
- [ ] Log a run today, then a backdated run. Both appear in History, Calendar and Analytics.
- [ ] Edit a run. The totals change. Delete a run (after confirming). The totals change back.
- [ ] A future date, 0 km, and a time like 1:75:00 are all rejected with a clear message.

## 3. Training plan
- [ ] Build a plan (with and without a race date). Sessions appear on the Calendar and Plan screens.
- [ ] Log a run on a planned date. That session turns Completed.
- [ ] Move one session, skip one, restore one. A past session with no run shows as Missed.
- [ ] Delete the plan. Logged runs remain.

## 4. Offline (turn on airplane mode)
- [ ] The app still opens, with a banner saying you're offline.
- [ ] Log a run. The form closes and the run appears straight away.
- [ ] Edit a run, skip a session, delete a run. All work and none hang.
- [ ] Turn the network back on. The banner says it is syncing, then disappears.
- [ ] Check the other device (or Firebase console): the offline changes arrived.
- [ ] Web only: close the tab while offline, reopen it. The app shell still loads.

## 5. Windows desktop (installed from the hosted site)
- [ ] Edge or Chrome offers "Install Momentum". It opens in its own window.
- [ ] Google sign-in works in the installed window.
- [ ] After publishing a new version, a "new version is ready" bar appears. Reload applies it.
