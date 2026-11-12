package com.dreamcreators.dailybell.widget

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class DailyBellWidgetPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == DailyBellWidgetModule.NAME) DailyBellWidgetModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      DailyBellWidgetModule.NAME to
        ReactModuleInfo(
          DailyBellWidgetModule.NAME,
          DailyBellWidgetModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          false, // isTurboModule (legacy module via interop)
        ),
    )
  }
}
