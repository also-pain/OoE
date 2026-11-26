const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.ooe.orderevents';

function withMySlotWidgetManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return modConfig;

    app.receiver = app.receiver || [];
    const alreadyExists = app.receiver.some(
      (r) => r.$?.['android:name'] === '.MySlotWidgetProvider'
    );

    if (!alreadyExists) {
      app.receiver.push({
        $: {
          'android:name': '.MySlotWidgetProvider',
          'android:exported': 'true',
          'android:label': 'MySlot Today',
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
              'android:resource': '@xml/myslot_widget_info',
            },
          },
        ],
      });
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

      // 1. Widget metadata
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

      // 2. Widget background drawable
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

      // 3. Widget layout
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

      // 4. WidgetProvider.kt
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
            val ids = manager.getAppWidgetIds(
                ComponentName(context, MySlotWidgetProvider::class.java)
            )
            for (id in ids) {
                updateAppWidget(context, manager, id)
            }
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

      // 5. WidgetBridgeModule.kt
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

      // 6. WidgetBridgePackage.kt
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

      // 7. Register WidgetBridgePackage in MainApplication.kt
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
