# DailyBell

A personal timetable app that works like a school timetable. It tracks the current and next
activity, shows a live countdown, and rings a bell when each activity starts (and optionally
when the day's last activity ends).

Built with React Native 0.87 (New Architecture), TypeScript, Zustand and AsyncStorage.
Bells use **native scheduled local notifications** (`react-native-notify-kit`, the maintained
Notifee fork), so they fire with the app backgrounded or closed. No JavaScript timers run in
the background.

## Features (Phase 1)

- **Home dashboard**: date and day, current activity with start/end times, large countdown
  and progress bar, next activity, alarm toggle, and the full day as a timeline. Completed,
  current and upcoming items are styled differently.
- **Default timetable**: 13 activities from 7:30 AM to 7:00 PM, preloaded on first launch.
- **Alarms**
  - A global on/off switch.
  - One daily-repeating native notification per bell moment. Each has a stable ID, so
    rescheduling replaces notifications instead of duplicating them.
  - In the foreground the app plays the bell itself, vibrates if enabled, and shows an
    in-app alarm with **Got it** and **Dismiss**. The system banner and sound are
    suppressed on iOS so the bell doesn't ring twice.
  - In the background or when the app is closed, the OS plays the bell sound with the
    notification. The notification has **Got it** and **Dismiss** actions.
  - Notifications are rescheduled when the timetable or alarm settings change, after
    restart, on returning to the foreground, and on time-zone changes.
- **Settings**: alarms on/off, ring at end, vibration, three bell sounds with preview, test
  bell, notification permission status, Android exact-alarm access, light/dark/system theme,
  and 10 theme colours (Indigo, Aubergine, Purple, Rose, Orange, Amber, Green, Teal, Ocean,
  Graphite). The chosen colour tints the whole app, including the hero card, buttons, toggles,
  backgrounds and Android notifications. Themes are built in `src/theme/theme.ts` (`ACCENTS`,
  `buildTheme`).
- **Home-screen widget (Android)**: the same "Now" card as the Home screen. It shows the activity,
  its time range and duration, a live countdown and a progress bar, and tapping it opens the app.
  Add it from **Settings → Home screen widget → Add widget to home screen**, which opens the
  launcher's own "Add widget" dialog on Android 8+, or from the launcher's widget picker. It also has an **Up next** panel and a day summary
  ("✓ 4 of 13 done · Day ends 7:00 PM"). Between activities it shows the next one with a countdown until it starts. The widget follows the chosen
  theme colour. Native code is in `android/app/src/main/java/com/dreamcreators/dailybell/widget/`. The countdown
  is a native `Chronometer`, so it ticks with no app code running, and the widget redraws only at
  activity boundaries and on time or time-zone changes. iPhone widgets need a WidgetKit extension
  and a paid Apple team, so they're planned for later.
- **Timetable editor**: rename, retime, add, delete and restore defaults, with overlap
  validation.

## Project structure

```
App.tsx                      Root: providers, alarm engine, navigator, in-app alarm modal
index.js                     Registers app + background notification-action handler
assets/sounds/               Source bell WAVs (copied into native projects)
src/
  models/types.ts            TypeScript models (Activity, BellEvent, AlarmSettings, …)
  data/defaultTimetable.ts   Default schedule + bell sound catalogue
  utils/time.ts              Local-time helpers (formatting, next occurrence, TZ signature)
  utils/schedule.ts          Pure logic: snapshot, bell events, validation, signatures
  store/                     Zustand stores (timetable & settings persisted, alarm runtime)
  services/
    notificationService.ts   Channels, permissions, native trigger scheduling / sync
    bellService.ts           Foreground bell playback + vibration
    alarmController.ts       Foreground bell detection, acknowledge, notification events
  hooks/                     useNow (foreground clock), useSchedule, useAlarmSync
  theme/                     Light/dark tokens + ThemeProvider
  components/                Card, CurrentActivityCard, NextActivityCard, TimelineItem,
                             AlarmToggle, AlarmModal, PermissionBanner, SettingRow, …
  screens/                   Home, Settings, Timetable, EditActivity
  navigation/                Native stack navigator
__tests__/schedule.test.ts   Unit tests for the scheduling logic
```

## Requirements

- Node ≥ 22.11
- **Android**: JDK 17, Android SDK (compile SDK 37), an emulator or device on Android 7.0+
- **iOS**: Xcode 26+, CocoaPods, iOS 15.1+

## Setup

```bash
npm install
```

### iOS

```bash
cd ios && pod install && cd ..
```

```bash
npm run ios
```

Or open `ios/DailyBell.xcworkspace` in Xcode, choose your team under *Signing &
Capabilities*, and run. Notification sounds work on a real device. The Simulator plays them
too, but its notification timing is less reliable.

### Android

JDK 17 is required. JDK 23 is not supported by this Gradle/AGP version.

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

```bash
npm run android
```

Release build:

```bash
cd android && ./gradlew assembleRelease
```

### Tests, types and lint

```bash
npm test && npx tsc --noEmit && npm run lint
```

## How alarms work and their platform limits

| State | What rings the bell |
|---|---|
| Foreground | The app: `bellService` plays the selected sound and shows the in-app alarm. A 1-second foreground clock checks for bell moments, and each one rings once per day. |
| Background / closed | The OS: a native scheduled notification with the bell sound. |
| After reboot | Android's `RebootBroadcastReceiver` re-arms the alarms. iOS keeps pending notifications across reboots. |
| Time-zone or DST change | Daily repeats use the local calendar on both platforms. The app also re-syncs on foreground when the time-zone signature changes. |

The OS can restrict delivery, so bells are best-effort:

- **Notification permission** is required for background bells. On first launch the app
  asks once. If permission is denied, a banner links to system settings.
- **Android 12+ exact alarms**: Android 14+ turns *Alarms & reminders* off by default.
  Without it the app falls back to inexact alarms, which can arrive a few minutes late.
  Settings → Exact alarms opens the system page.
- **Android channels** fix sound and vibration when they are created. DailyBell creates one
  channel per sound/vibration combination and moves the schedule between them. Users can
  still change a channel's sound in system settings.
- **Battery optimisation, Doze, OEM task killers, Focus / Do Not Disturb, and silent mode**
  can delay or silence bells. Nothing bypasses them. The app never uses critical alerts,
  never forces itself into the foreground, and never closes other apps.
- **iOS vibration** for background notifications follows the system sound and haptics
  settings. The Vibration toggle controls in-app vibration on iOS.
- **iOS Time Sensitive**: notifications use the `active` interruption level. To let bells
  break through Focus, add the *Time Sensitive Notifications* capability (paid team) and
  change `interruptionLevel` to `'timeSensitive'` in `src/services/notificationService.ts`.
- **iOS pending-notification limit**: iOS allows 64 pending notifications. DailyBell uses one
  repeating notification per bell (14 with the default timetable).

## Bell sounds

Every bell rings **exactly 3 times and then stops**, so it never keeps going and annoys the
user. That holds for the in-app bell and the notification sound. Vibration is 3 pulses to
match. Nothing loops or repeats: each bell moment is a single notification. The sounds are
generated by `python3 scripts/generate-bells.py` (stdlib only), which writes all three copies.
If you change a sound or the vibration, bump `CHANNEL_VERSION` in
`src/services/notificationService.ts`, because Android channels can't be edited after they're
created. The app then deletes the old channels and reschedules every bell on the new ones.

The three WAV files in `assets/sounds/` were generated for this project. They are copied to:

- `android/app/src/main/res/raw/` (protected from resource shrinking by `res/raw/keep.xml`)
- `ios/DailyBell/Sounds/` (added to the app target's *Copy Bundle Resources*)

To add a sound, put the file in both places (on iOS, add it to the target in Xcode), then add
an entry to `BELL_SOUNDS` in `src/data/defaultTimetable.ts` and to the `BellSoundId` type. iOS
notification sounds must be 30 seconds or shorter.

## Troubleshooting

- **Port 8081 is already in use.** On this machine the McAfee agent (`macmnsvc`) listens on
  8081, so start Metro on another port with `npx react-native start --port 8082`. On iOS, point
  the app at that port with `xcrun simctl spawn booted defaults write com.dreamcreators.dailybell RCT_jsLocation "localhost:8082"`.
  On Android, run `npm run android -- --port 8082`.
- **App identifier**: `com.dreamcreators.dailybell` on both platforms (Android `applicationId`
  and package, iOS bundle identifier). Play and the App Store tie the app to this ID permanently.

## Out of scope for Phase 1

Login, backend, Firebase, analytics and cloud sync.
