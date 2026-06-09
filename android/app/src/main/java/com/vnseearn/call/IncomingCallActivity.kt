// Description: Shows a full-screen Android incoming call surface for LiveKit calls.
package com.vnseearn.call

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.vnseearn.MainActivity

class IncomingCallActivity : Activity() {
  private fun extra(key: String) = intent.getStringExtra(key).orEmpty()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
    )

    val isGroupCall = extra(LiveKitCallNativeActions.EXTRA_EVENT_TYPE) == "livekit_group_call"
    val callerName = if (isGroupCall) {
      extra(LiveKitCallNativeActions.EXTRA_GROUP_NAME).ifBlank { "Nhom" }
    } else {
      extra(LiveKitCallNativeActions.EXTRA_NAME).ifBlank { "VNSEEA" }
    }
    val callType = if (extra(LiveKitCallNativeActions.EXTRA_CALL_TYPE) == "audio") {
      if (isGroupCall) "Cuoc goi nhom thoai" else "Cuoc goi thoai"
    } else {
      if (isGroupCall) "Cuoc goi nhom video" else "Cuoc goi video"
    }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(48, 72, 48, 72)
      setBackgroundColor(0xFF050816.toInt())
    }
    root.addView(TextView(this).apply {
      text = callerName
      textSize = 30f
      setTextColor(0xFFFFFFFF.toInt())
      gravity = Gravity.CENTER
    })
    root.addView(TextView(this).apply {
      text = callType
      textSize = 18f
      setTextColor(0xFFD6D9E6.toInt())
      gravity = Gravity.CENTER
    })

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, 80, 0, 0)
    }
    actions.addView(Button(this).apply {
      text = "Decline"
      setOnClickListener {
        LiveKitCallNativeActions.postAction(
          extra(LiveKitCallNativeActions.EXTRA_API_URL),
          extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
          "decline",
        )
        finishAndRemoveTask()
      }
    })
    actions.addView(Button(this).apply {
      text = "Answer"
      setOnClickListener {
        LiveKitCallNativeActions.postAction(
          extra(LiveKitCallNativeActions.EXTRA_API_URL),
          extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
          "answer",
        )
        startActivity(Intent(this@IncomingCallActivity, MainActivity::class.java).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
          putExtras(intent)
          putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "answer")
        })
        finish()
      }
    })
    root.addView(actions)
    setContentView(root)
  }
}
