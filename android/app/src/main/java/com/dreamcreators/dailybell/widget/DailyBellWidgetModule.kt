package com.dreamcreators.dailybell.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** JS bridge: push timetable data to the widget and ask the launcher to add one. */
class DailyBellWidgetModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName() = NAME

  /** json: {"color":"#RRGGBB","activities":[{"name","start","end"}]} (minutes). */
  @ReactMethod
  fun setData(json: String, promise: Promise) {
    try {
      WidgetStore.save(ctx, json)
      DailyBellWidgetProvider.updateAll(ctx)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("widget_update_failed", e)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val map = Arguments.createMap()
      map.putInt("installed", DailyBellWidgetProvider.installedIds(ctx).size)
      map.putBoolean("pinSupported", pinSupported())
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("widget_status_failed", e)
    }
  }

  /** Shows the launcher's "Add widget" dialog. Resolves false if not supported. */
  @ReactMethod
  fun requestPin(promise: Promise) {
    try {
      if (!pinSupported()) {
        promise.resolve(false)
        return
      }
      val shown = AppWidgetManager.getInstance(ctx).requestPinAppWidget(
        ComponentName(ctx, DailyBellWidgetProvider::class.java),
        null,
        null,
      )
      promise.resolve(shown)
    } catch (e: Exception) {
      promise.reject("widget_pin_failed", e)
    }
  }

  private fun pinSupported(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      AppWidgetManager.getInstance(ctx).isRequestPinAppWidgetSupported

  companion object {
    const val NAME = "DailyBellWidget"
  }
}
