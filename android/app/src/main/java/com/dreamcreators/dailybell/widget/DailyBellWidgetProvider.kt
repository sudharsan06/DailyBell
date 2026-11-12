package com.dreamcreators.dailybell.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import com.dreamcreators.dailybell.MainActivity
import com.dreamcreators.dailybell.R

/**
 * Home-screen widget: the app's Home "current activity" card (NOW pill,
 * duration, name, time range, countdown, progress) plus an Up next panel and
 * the day's progress ("4 of 13 done · Day ends 7:00 PM").
 * Tapping it opens the app for the full timetable and settings.
 *
 * The countdown is a Chronometer, so it ticks on its own with no app code
 * running. The widget only redraws at activity boundaries (scheduled with
 * AlarmManager), on time / time-zone changes, and when the app sends a new
 * timetable or colour. It doesn't wake the device: a boundary passed while
 * the screen is off is drawn as soon as the device wakes.
 */
class DailyBellWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    render(context, manager, ids)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_TICK,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_LOCALE_CHANGED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> updateAll(context)
    }
  }

  override fun onDisabled(context: Context) {
    // Last widget removed: stop scheduling redraws.
    alarmManager(context).cancel(tickIntent(context))
  }

  companion object {
    private const val ACTION_TICK = "com.dreamcreators.dailybell.widget.TICK"

    fun installedIds(context: Context): IntArray =
      AppWidgetManager.getInstance(context)
        .getAppWidgetIds(ComponentName(context, DailyBellWidgetProvider::class.java))

    fun updateAll(context: Context) {
      val ids = installedIds(context)
      if (ids.isNotEmpty()) render(context, AppWidgetManager.getInstance(context), ids)
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val data = WidgetStore.load(context)
      val nowSec = WidgetStore.secondsOfDay()
      val snap = WidgetStore.snapshot(data.activities, nowSec)
      for (id in ids) manager.updateAppWidget(id, buildViews(context, data, snap))
      scheduleNext(context, WidgetStore.secondsToNextBoundary(data.activities, nowSec))
    }

    private fun buildViews(context: Context, data: WidgetData, snap: WidgetSnapshot): RemoteViews {
      val v = RemoteViews(context.packageName, R.layout.widget_dailybell)
      v.setInt(R.id.widget_bg, "setColorFilter", data.color)
      v.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context))

      val list = data.activities
      val nowSec = WidgetStore.secondsOfDay()
      when (snap) {
        is WidgetSnapshot.Current -> {
          v.setImageViewResource(R.id.widget_dot, R.drawable.widget_dot)
          v.setTextViewText(R.id.widget_label, context.getString(R.string.widget_now))
          v.setTextViewText(R.id.widget_duration, WidgetStore.formatDuration(snap.activity))
          v.setTextViewText(R.id.widget_title, snap.activity.name)
          v.setTextViewText(R.id.widget_range, WidgetStore.formatRange(snap.activity))
          showCountdown(v, snap.secondsLeft, context.getString(R.string.widget_remaining))
          v.setViewVisibility(R.id.widget_progress, View.VISIBLE)
          v.setProgressBar(R.id.widget_progress, 1000, (snap.progress * 1000).toInt(), false)
          showNext(context, v, context.getString(R.string.widget_up_next), snap.next)
        }
        is WidgetSnapshot.Waiting -> {
          v.setImageViewResource(R.id.widget_dot, R.drawable.widget_dot_idle)
          v.setTextViewText(
            R.id.widget_label,
            context.getString(if (snap.tomorrow) R.string.widget_tomorrow else R.string.widget_up_next),
          )
          v.setTextViewText(R.id.widget_duration, WidgetStore.formatDuration(snap.next))
          v.setTextViewText(R.id.widget_title, snap.next.name)
          v.setTextViewText(R.id.widget_range, WidgetStore.formatRange(snap.next))
          showCountdown(v, snap.secondsUntil, context.getString(R.string.widget_to_start))
          // Between activities the bar shows how much of the day is done.
          v.setViewVisibility(R.id.widget_progress, View.VISIBLE)
          val done = if (snap.tomorrow) list.size else WidgetStore.doneCount(list, nowSec)
          v.setProgressBar(R.id.widget_progress, list.size, done, false)
          showNext(context, v, context.getString(R.string.widget_after_that), WidgetStore.following(list, snap.next))
        }
        WidgetSnapshot.Empty -> {
          v.setImageViewResource(R.id.widget_dot, R.drawable.widget_dot_idle)
          v.setTextViewText(R.id.widget_label, context.getString(R.string.app_name))
          v.setTextViewText(R.id.widget_duration, "")
          v.setTextViewText(R.id.widget_title, context.getString(R.string.widget_empty_title))
          v.setTextViewText(R.id.widget_range, context.getString(R.string.widget_empty_body))
          v.setViewVisibility(R.id.widget_countdown_row, View.INVISIBLE)
          v.setViewVisibility(R.id.widget_next_box, View.INVISIBLE)
          v.setViewVisibility(R.id.widget_progress, View.GONE)
          v.setViewVisibility(R.id.widget_footer, View.GONE)
          return v
        }
      }

      // Day summary footer.
      v.setViewVisibility(R.id.widget_footer, View.VISIBLE)
      val tomorrow = snap is WidgetSnapshot.Waiting && snap.tomorrow
      v.setTextViewText(
        R.id.widget_day_done,
        if (tomorrow) context.getString(R.string.widget_all_done, list.size)
        else context.getString(R.string.widget_done_count, WidgetStore.doneCount(list, nowSec), list.size),
      )
      v.setTextViewText(
        R.id.widget_day_end,
        if (tomorrow) context.getString(R.string.widget_day_starts_time, WidgetStore.formatTime(list.first().start))
        else context.getString(R.string.widget_day_end_time, WidgetStore.formatTime(list.last().end)),
      )
      return v
    }

    private fun showNext(context: Context, v: RemoteViews, label: String, next: WidgetActivity?) {
      v.setViewVisibility(R.id.widget_next_box, View.VISIBLE)
      v.setTextViewText(R.id.widget_next_label, label)
      if (next != null) {
        v.setTextViewText(R.id.widget_next_title, next.name)
        v.setTextViewText(
          R.id.widget_next_time,
          "${WidgetStore.formatTime(next.start)} · ${WidgetStore.formatDuration(next)}",
        )
      } else {
        v.setTextViewText(R.id.widget_next_title, context.getString(R.string.widget_last_today))
        v.setTextViewText(R.id.widget_next_time, "🎉")
      }
    }

    private fun showCountdown(v: RemoteViews, seconds: Long, suffix: String) {
      v.setViewVisibility(R.id.widget_countdown_row, View.VISIBLE)
      v.setChronometer(
        R.id.widget_countdown,
        SystemClock.elapsedRealtime() + seconds * 1000L,
        null,
        true,
      )
      v.setChronometerCountDown(R.id.widget_countdown, true)
      v.setTextViewText(R.id.widget_countdown_suffix, suffix)
    }

    private fun scheduleNext(context: Context, inSeconds: Long?) {
      val am = alarmManager(context)
      val pi = tickIntent(context)
      if (inSeconds == null) {
        am.cancel(pi)
        return
      }
      // +1 s so we land just after the boundary, not just before it.
      val at = System.currentTimeMillis() + (inSeconds + 1) * 1000L
      val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
      // RTC (not RTC_WAKEUP): never wakes the device just to redraw a widget.
      if (canExact) {
        am.setExact(AlarmManager.RTC, at, pi)
      } else {
        am.setWindow(AlarmManager.RTC, at, 60_000L, pi)
      }
    }

    private fun alarmManager(context: Context) =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun tickIntent(context: Context): PendingIntent =
      PendingIntent.getBroadcast(
        context,
        1001,
        Intent(context, DailyBellWidgetProvider::class.java).setAction(ACTION_TICK),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    private fun openAppIntent(context: Context): PendingIntent =
      PendingIntent.getActivity(
        context,
        1002,
        Intent(context, MainActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
  }
}
