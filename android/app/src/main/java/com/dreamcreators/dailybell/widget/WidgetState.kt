package com.dreamcreators.dailybell.widget

import android.content.Context
import org.json.JSONObject
import java.util.Calendar

/** One timetable entry, in minutes since local midnight. */
data class WidgetActivity(val name: String, val start: Int, val end: Int)

/** What the app last sent: the timetable and the colour to paint the widget. */
data class WidgetData(val color: Int, val activities: List<WidgetActivity>)

/** What the widget should show right now. */
sealed class WidgetSnapshot {
  /** An activity is running. */
  data class Current(
    val activity: WidgetActivity,
    val next: WidgetActivity?,
    val secondsLeft: Long,
    val progress: Float,
  ) : WidgetSnapshot()

  /** Between activities, or before/after the day (tomorrow = next starts tomorrow). */
  data class Waiting(
    val next: WidgetActivity,
    val secondsUntil: Long,
    val tomorrow: Boolean,
  ) : WidgetSnapshot()

  object Empty : WidgetSnapshot()
}

object WidgetStore {
  private const val PREFS = "dailybell_widget"
  private const val KEY = "data"
  private const val DEFAULT_COLOR = 0xFF4B4BC8.toInt()

  fun save(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
  }

  /** Never throws: bad or missing data just shows the empty state. */
  fun load(context: Context): WidgetData {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
      ?: return WidgetData(DEFAULT_COLOR, emptyList())
    return try {
      val obj = JSONObject(raw)
      val color = try {
        android.graphics.Color.parseColor(obj.optString("color", "#4B4BC8"))
      } catch (_: IllegalArgumentException) {
        DEFAULT_COLOR
      }
      val arr = obj.optJSONArray("activities")
      val list = mutableListOf<WidgetActivity>()
      if (arr != null) {
        for (i in 0 until arr.length()) {
          val a = arr.optJSONObject(i) ?: continue
          val name = a.optString("name", "").trim()
          val start = a.optInt("start", -1)
          val end = a.optInt("end", -1)
          if (name.isNotEmpty() && start in 0..1440 && end in 0..1440 && end > start) {
            list.add(WidgetActivity(name, start, end))
          }
        }
      }
      WidgetData(color, list.sortedBy { it.start })
    } catch (_: Exception) {
      WidgetData(DEFAULT_COLOR, emptyList())
    }
  }

  fun secondsOfDay(cal: Calendar = Calendar.getInstance()): Long =
    cal.get(Calendar.HOUR_OF_DAY) * 3600L + cal.get(Calendar.MINUTE) * 60L + cal.get(Calendar.SECOND)

  fun snapshot(list: List<WidgetActivity>, nowSec: Long): WidgetSnapshot {
    if (list.isEmpty()) return WidgetSnapshot.Empty
    val current = list.firstOrNull { nowSec >= it.start * 60L && nowSec < it.end * 60L }
    if (current != null) {
      val total = (current.end - current.start) * 60L
      val left = current.end * 60L - nowSec
      return WidgetSnapshot.Current(
        activity = current,
        next = list.firstOrNull { it.start >= current.end },
        secondsLeft = left,
        progress = if (total > 0) 1f - left.toFloat() / total else 0f,
      )
    }
    val laterToday = list.firstOrNull { it.start * 60L > nowSec }
    return if (laterToday != null) {
      WidgetSnapshot.Waiting(laterToday, laterToday.start * 60L - nowSec, tomorrow = false)
    } else {
      val first = list.first()
      WidgetSnapshot.Waiting(first, 86_400L - nowSec + first.start * 60L, tomorrow = true)
    }
  }

  /** Seconds from now until the next start/end boundary (when the widget must redraw). */
  fun secondsToNextBoundary(list: List<WidgetActivity>, nowSec: Long): Long? {
    if (list.isEmpty()) return null
    val marks = list.flatMap { listOf(it.start * 60L, it.end * 60L) }
    val today = marks.filter { it > nowSec }.minOrNull()
    return if (today != null) today - nowSec else 86_400L - nowSec + marks.min()
  }

  /** Activities already finished today. */
  fun doneCount(list: List<WidgetActivity>, nowSec: Long): Int =
    list.count { it.end * 60L <= nowSec }

  /** The activity after [a], if any. */
  fun following(list: List<WidgetActivity>, a: WidgetActivity): WidgetActivity? =
    list.firstOrNull { it.start >= a.end && it != a }

  fun formatTime(minutes: Int): String {
    val m = ((minutes % 1440) + 1440) % 1440
    val h24 = m / 60
    val suffix = if (h24 >= 12) "PM" else "AM"
    val h12 = if (h24 % 12 == 0) 12 else h24 % 12
    return "%d:%02d %s".format(h12, m % 60, suffix)
  }

  fun formatDuration(a: WidgetActivity): String {
    val mins = a.end - a.start
    val h = mins / 60
    val m = mins % 60
    return when {
      h > 0 && m > 0 -> "${h}h ${m}m"
      h > 0 -> "${h}h"
      else -> "${m}m"
    }
  }

  fun formatRange(a: WidgetActivity) = "${formatTime(a.start)} – ${formatTime(a.end)}"
}
