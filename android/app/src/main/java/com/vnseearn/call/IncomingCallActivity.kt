// Description: Shows a full-screen Android incoming call surface for LiveKit calls.
package com.vnseearn.call

import android.app.Activity
import android.app.NotificationManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.vnseearn.MainActivity

class IncomingCallActivity : Activity() {
  private fun extra(key: String) = intent.getStringExtra(key).orEmpty()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
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
      if (isGroupCall) "GROUP AUDIO CALL" else "AUDIO CALL"
    } else {
      if (isGroupCall) "GROUP VIDEO CALL" else "VIDEO CALL"
    }

    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.rgb(14, 54, 86))
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    val content = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(32), dp(54), dp(32), dp(42))
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    val avatarText = callerName.trim().take(1).ifBlank { "V" }.uppercase()
    content.addView(TextView(this).apply {
      text = avatarText
      textSize = 42f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.rgb(14, 54, 86))
      gravity = Gravity.CENTER
      background = oval(Color.rgb(222, 232, 240))
      layoutParams = LinearLayout.LayoutParams(dp(112), dp(112)).apply {
        bottomMargin = dp(28)
      }
    })

    content.addView(TextView(this).apply {
      text = callerName
      textSize = 28f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      maxLines = 2
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
    })
    content.addView(TextView(this).apply {
      text = "$callType..."
      textSize = 18f
      letterSpacing = 0.08f
      setTextColor(Color.rgb(215, 226, 236))
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dp(12)
      }
    })

    val spacer = View(this).apply {
      layoutParams = LinearLayout.LayoutParams(1, 0, 1f)
    }
    content.addView(spacer)

    val utilityActions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        bottomMargin = dp(34)
      }
    }
    utilityActions.addView(utilityButton("Remind Me"))
    utilityActions.addView(utilityButton("Message"))
    content.addView(utilityActions)

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
    }
    actions.addView(callButton("Decline", Color.rgb(238, 48, 48)).apply {
      setOnClickListener {
        cancelNotification()
        LiveKitCallNativeActions.postAction(
          extra(LiveKitCallNativeActions.EXTRA_API_URL),
          extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
          "decline",
        )
        finishAndRemoveTask()
      }
    })
    actions.addView(callButton("Answer", Color.rgb(88, 208, 72)).apply {
      setOnClickListener {
        cancelNotification()
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
    content.addView(actions)
    root.addView(content)
    setContentView(root)
  }

  private fun callButton(label: String, color: Int): TextView {
    return TextView(this).apply {
      text = label
      textSize = 14f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = oval(color)
      layoutParams = LinearLayout.LayoutParams(dp(86), dp(86)).apply {
        leftMargin = dp(26)
        rightMargin = dp(26)
      }
    }
  }

  private fun utilityButton(label: String): TextView {
    return TextView(this).apply {
      text = label
      textSize = 12f
      setTextColor(Color.rgb(226, 235, 243))
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(dp(112), dp(42)).apply {
        leftMargin = dp(10)
        rightMargin = dp(10)
      }
    }
  }

  private fun oval(color: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
    }
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
  }

  private fun cancelNotification() {
    val callId = extra(LiveKitCallNativeActions.EXTRA_CALL_ID)
    if (callId.isBlank()) return
    val manager = getSystemService(NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancel(callId.hashCode())
  }
}
