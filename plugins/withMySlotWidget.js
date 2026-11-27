const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.ooe.orderevents';

const WIDGET_RECEIVERS = [
  {
    name: '.MySlotWidgetProvider',
    label: 'MySlot Today',
    resource: '@xml/myslot_widget_info',
  },
  {
    name: '.MySlotNextWidgetProvider',
    label: 'MySlot Up Next',
    resource: '@xml/myslot_next_widget_info',
  },
  {
    name: '.MySlotQuickAddWidgetProvider',
    label: 'MySlot Quick Add',
    resource: '@xml/myslot_quickadd_widget_info',
  },
];

function withMySlotWidgetManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return modConfig;

    app.receiver = app.receiver || [];
    for (const widget of WIDGET_RECEIVERS) {
      const exists = app.receiver.some((r) => r.$?.['android:name'] === widget.name);
      if (!exists) {
        app.receiver.push({
          $: {
            'android:name': widget.name,
            'android:exported': 'true',
            'android:label': widget.label,
          },
          'intent-filter': [
            {
              action: [
                {
                  $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': widget.resource,
              },
            },
          ],
        });
      }
    }

    return modConfig;
  });
}

function withMySlotWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const resRoot = path.join(androidRoot, 'app', 'src', 'main', 'res');
      const javaRoot = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        ...PACKAGE_NAME.split('.')
      );

      fs.mkdirSync(path.join(resRoot, 'xml'), { recursive: true });
      fs.mkdirSync(path.join(resRoot, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(resRoot, 'drawable'), { recursive: true });
      fs.mkdirSync(javaRoot, { recursive: true });

      // Shared drawables
      fs.writeFileSync(
        path.join(resRoot, 'drawable', 'myslot_widget_bg.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#0F1E36" />
    <corners android:radius="14dp" />
    <stroke android:width="1dp" android:color="#1E293B" />
</shape>
`
      );

      fs.writeFileSync(
        path.join(resRoot, 'drawable', 'myslot_amber_pill.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#D97706" />
    <corners android:radius="8dp" />
</shape>
`
      );

      // 1. MySlot Today Widget (4x2)
      fs.writeFileSync(
        path.join(resRoot, 'xml', 'myslot_widget_info.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/myslot_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`
      );

      fs.writeFileSync(
        path.join(resRoot, 'layout', 'myslot_widget.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/myslot_widget_bg"
    android:orientation="vertical"
    android:padding="14dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingBottom="8dp">

        <TextView
            android:id="@+id/widget_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="MySlot • Today"
            android:textColor="#FFFFFF"
            android:textSize="14sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_date"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=""
            android:textColor="#F59E0B"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_empty"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No upcoming events scheduled today"
        android:textColor="#94A3B8"
        android:textSize="12sp"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_item_1"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="1"
        android:paddingBottom="4dp"
        android:textColor="#FFFFFF"
        android:textSize="13sp"
        android:textStyle="bold"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_item_2"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="1"
        android:paddingBottom="4dp"
        android:textColor="#CBD5E1"
        android:textSize="12sp"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_item_3"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="1"
        android:textColor="#CBD5E1"
        android:textSize="12sp"
        android:visibility="gone" />
</LinearLayout>
`
      );

      // 2. MySlot Up Next Spotlight Widget (3x2)
      fs.writeFileSync(
        path.join(resRoot, 'xml', 'myslot_next_widget_info.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/myslot_next_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`
      );

      fs.writeFileSync(
        path.join(resRoot, 'layout', 'myslot_next_widget.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/next_widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/myslot_widget_bg"
    android:orientation="vertical"
    android:padding="14dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingBottom="6dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/myslot_amber_pill"
            android:paddingLeft="8dp"
            android:paddingTop="2dp"
            android:paddingRight="8dp"
            android:paddingBottom="2dp"
            android:text="UP NEXT"
            android:textColor="#FFFFFF"
            android:textSize="10sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/next_widget_time"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:gravity="end"
            android:text="--:--"
            android:textColor="#F59E0B"
            android:textSize="13sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/next_widget_occasion"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="2"
        android:paddingBottom="4dp"
        android:text="No upcoming events"
        android:textColor="#FFFFFF"
        android:textSize="14sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/next_widget_place"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="1"
        android:text=""
        android:textColor="#CBD5E1"
        android:textSize="12sp" />

    <TextView
        android:id="@+id/next_widget_organiser"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="1"
        android:text=""
        android:textColor="#94A3B8"
        android:textSize="11sp" />
</LinearLayout>
`
      );

      // 3. MySlot Quick Add Widget (4x1)
      fs.writeFileSync(
        path.join(resRoot, 'xml', 'myslot_quickadd_widget_info.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="52dp"
    android:targetCellWidth="4"
    android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/myslot_quickadd_widget"
    android:resizeMode="horizontal"
    android:widgetCategory="home_screen" />
`
      );

      fs.writeFileSync(
        path.join(resRoot, 'layout', 'myslot_quickadd_widget.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/quickadd_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/myslot_widget_bg"
    android:gravity="center_vertical"
    android:orientation="horizontal"
    android:paddingLeft="14dp"
    android:paddingTop="8dp"
    android:paddingRight="12dp"
    android:paddingBottom="8dp">

    <LinearLayout
        android:id="@+id/quickadd_info"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical"
        android:paddingRight="10dp">

        <TextView
            android:id="@+id/quickadd_label"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="MySlot"
            android:textColor="#94A3B8"
            android:textSize="10sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/quickadd_next"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="No events today"
            android:textColor="#FFFFFF"
            android:textSize="13sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/quickadd_btn"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/myslot_amber_pill"
        android:paddingLeft="12dp"
        android:paddingTop="8dp"
        android:paddingRight="12dp"
        android:paddingBottom="8dp"
        android:text="+ New Slot"
        android:textColor="#FFFFFF"
        android:textSize="12sp"
        android:textStyle="bold" />
</LinearLayout>
`
      );

      // Kotlin Providers
      fs.writeFileSync(
        path.join(javaRoot, 'MySlotWidgetProvider.kt'),
        `package ${PACKAGE_NAME}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

class MySlotWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        const val PREFS_NAME = "MySlotWidgetPrefs"
        const val KEY_PAYLOAD = "widget_payload"

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val todayIds = manager.getAppWidgetIds(
                ComponentName(context, MySlotWidgetProvider::class.java)
            )
            for (id in todayIds) updateAppWidget(context, manager, id)

            val nextIds = manager.getAppWidgetIds(
                ComponentName(context, MySlotNextWidgetProvider::class.java)
            )
            for (id in nextIds) MySlotNextWidgetProvider.updateAppWidget(context, manager, id)

            val quickIds = manager.getAppWidgetIds(
                ComponentName(context, MySlotQuickAddWidgetProvider::class.java)
            )
            for (id in quickIds) MySlotQuickAddWidgetProvider.updateAppWidget(context, manager, id)
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.myslot_widget)

            val launchIntent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString(KEY_PAYLOAD, null)

            if (raw.isNullOrEmpty()) {
                views.setTextViewText(R.id.widget_date, "")
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                views.setViewVisibility(R.id.widget_item_1, View.GONE)
                views.setViewVisibility(R.id.widget_item_2, View.GONE)
                views.setViewVisibility(R.id.widget_item_3, View.GONE)
            } else {
                try {
                    val json = JSONObject(raw)
                    val dateLabel = json.optString("dateLabel", "")
                    val items = json.optJSONArray("items")
                    views.setTextViewText(R.id.widget_date, dateLabel)

                    val slotIds = intArrayOf(
                        R.id.widget_item_1,
                        R.id.widget_item_2,
                        R.id.widget_item_3
                    )

                    if (items == null || items.length() == 0) {
                        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                        for (id in slotIds) views.setViewVisibility(id, View.GONE)
                    } else {
                        views.setViewVisibility(R.id.widget_empty, View.GONE)
                        for (i in slotIds.indices) {
                            if (i < items.length()) {
                                val obj = items.getJSONObject(i)
                                val time = obj.optString("time", "")
                                val occasion = obj.optString("occasion", "")
                                val place = obj.optString("place", "")
                                views.setTextViewText(
                                    slotIds[i],
                                    "$time • $occasion ($place)"
                                )
                                views.setViewVisibility(slotIds[i], View.VISIBLE)
                            } else {
                                views.setViewVisibility(slotIds[i], View.GONE)
                            }
                        }
                    }
                } catch (_: Exception) {
                    views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`
      );

      fs.writeFileSync(
        path.join(javaRoot, 'MySlotNextWidgetProvider.kt'),
        `package ${PACKAGE_NAME}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class MySlotNextWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.myslot_next_widget)
            val launchIntent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                1,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.next_widget_root, pendingIntent)

            val prefs = context.getSharedPreferences(
                MySlotWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val raw = prefs.getString(MySlotWidgetProvider.KEY_PAYLOAD, null)

            if (raw.isNullOrEmpty()) {
                views.setTextViewText(R.id.next_widget_time, "--:--")
                views.setTextViewText(R.id.next_widget_occasion, "No upcoming events")
                views.setTextViewText(R.id.next_widget_place, "Tap to open MySlot")
                views.setTextViewText(R.id.next_widget_organiser, "")
            } else {
                try {
                    val json = JSONObject(raw)
                    val upNext = json.optJSONObject("upNext")
                    if (upNext == null) {
                        views.setTextViewText(R.id.next_widget_time, "DONE")
                        views.setTextViewText(R.id.next_widget_occasion, "No more events today")
                        views.setTextViewText(R.id.next_widget_place, "Tap to schedule")
                        views.setTextViewText(R.id.next_widget_organiser, "")
                    } else {
                        views.setTextViewText(R.id.next_widget_time, upNext.optString("time", ""))
                        views.setTextViewText(R.id.next_widget_occasion, upNext.optString("occasion", ""))
                        views.setTextViewText(R.id.next_widget_place, upNext.optString("place", ""))
                        views.setTextViewText(R.id.next_widget_organiser, upNext.optString("organiser", ""))
                    }
                } catch (_: Exception) {
                    views.setTextViewText(R.id.next_widget_occasion, "Tap to open MySlot")
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`
      );

      fs.writeFileSync(
        path.join(javaRoot, 'MySlotQuickAddWidgetProvider.kt'),
        `package ${PACKAGE_NAME}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject

class MySlotQuickAddWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.myslot_quickadd_widget)

            val openIntent = Intent(context, MainActivity::class.java)
            val openPending = PendingIntent.getActivity(
                context,
                2,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.quickadd_info, openPending)

            val addIntent = Intent(Intent.ACTION_VIEW, Uri.parse("myslot://add"), context, MainActivity::class.java)
            val addPending = PendingIntent.getActivity(
                context,
                3,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.quickadd_btn, addPending)

            val prefs = context.getSharedPreferences(
                MySlotWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val raw = prefs.getString(MySlotWidgetProvider.KEY_PAYLOAD, null)
            if (!raw.isNullOrEmpty()) {
                try {
                    val json = JSONObject(raw)
                    val upNext = json.optJSONObject("upNext")
                    val total = json.optInt("totalToday", 0)
                    views.setTextViewText(R.id.quickadd_label, "MySlot • \$total today")
                    if (upNext != null) {
                        views.setTextViewText(
                            R.id.quickadd_next,
                            "\${upNext.optString("time", "")} • \${upNext.optString("occasion", "")}"
                        )
                    } else {
                        views.setTextViewText(R.id.quickadd_next, "No upcoming events")
                    }
                } catch (_: Exception) {
                    views.setTextViewText(R.id.quickadd_next, "Tap to view schedule")
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`
      );

      // WidgetBridgeModule.kt & WidgetBridgePackage.kt
      fs.writeFileSync(
        path.join(javaRoot, 'WidgetBridgeModule.kt'),
        `package ${PACKAGE_NAME}

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetBridge"

    @ReactMethod
    fun updateWidget(jsonPayload: String) {
        val prefs = reactContext.getSharedPreferences(
            MySlotWidgetProvider.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().putString(MySlotWidgetProvider.KEY_PAYLOAD, jsonPayload).apply()
        MySlotWidgetProvider.updateAllWidgets(reactContext)
    }
}
`
      );

      fs.writeFileSync(
        path.join(javaRoot, 'WidgetBridgePackage.kt'),
        `package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WidgetBridgePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(WidgetBridgeModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`
      );

      const mainAppPath = path.join(javaRoot, 'MainApplication.kt');
      if (fs.existsSync(mainAppPath)) {
        let mainApp = fs.readFileSync(mainAppPath, 'utf8');
        if (!mainApp.includes('WidgetBridgePackage()')) {
          mainApp = mainApp.replace(
            'PackageList(this).packages.apply {',
            'PackageList(this).packages.apply {\n              add(WidgetBridgePackage())'
          );
          fs.writeFileSync(mainAppPath, mainApp);
        }
      }

      return modConfig;
    },
  ]);
}

module.exports = function withMySlotWidget(config) {
  config = withMySlotWidgetManifest(config);
  config = withMySlotWidgetFiles(config);
  return config;
};
