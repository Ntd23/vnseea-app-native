// Description: Shows a full-screen Android incoming call surface for LiveKit calls.
package com.vnseea.android.call

import android.app.Activity
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.view.WindowInsets
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.vnseea.android.MainActivity
import com.vnseea.android.R
import java.net.URL
import java.util.Calendar

class IncomingCallActivity : Activity() {
  private companion object {
    const val INCOMING_CALL_RINGTONE_RES_NAME = "incoming_call_ringtone"
  }

  private var dismissReceiver: BroadcastReceiver? = null
  private var ringtone: Ringtone? = null

  private fun extra(key: String) = intent.getStringExtra(key).orEmpty()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (finishIfIncomingCallWasHandled()) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
    )
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT

    registerDismissReceiver()

    val isGroupCall = extra(LiveKitCallNativeActions.EXTRA_EVENT_TYPE) == "livekit_group_call"
    val callerName = if (isGroupCall) {
      extra(LiveKitCallNativeActions.EXTRA_GROUP_NAME).ifBlank { "VNSEEA" }
    } else {
      extra(LiveKitCallNativeActions.EXTRA_NAME).ifBlank { "VNSEEA" }
    }
    val avatarUrl = if (isGroupCall) {
      extra(LiveKitCallNativeActions.EXTRA_GROUP_AVATAR)
    } else {
      extra(LiveKitCallNativeActions.EXTRA_AVATAR)
    }
    val callerBackgroundUrl = callerBackgroundUrl(isGroupCall, avatarUrl)
    val isAudioCall = extra(LiveKitCallNativeActions.EXTRA_CALL_TYPE) == "audio"
    val titleText = if (isAudioCall) {
      "Cu\u1ed9c g\u1ecdi tho\u1ea1i"
    } else {
      "Cu\u1ed9c g\u1ecdi video"
    }
    val titleIcon = if (isAudioCall) R.drawable.ic_call_phone_modern else R.drawable.ic_call_video_modern
    val callDescription = if (isAudioCall) {
      "B\u1ea1n \u0111ang c\u00f3 cu\u1ed9c g\u1ecdi tho\u1ea1i \u0111\u1ebfn"
    } else {
      "B\u1ea1n \u0111ang c\u00f3 cu\u1ed9c g\u1ecdi video \u0111\u1ebfn"
    }
    val backgroundMode = currentBackgroundMode()

    val root = FrameLayout(this).apply {
      background = backgroundMode.fallbackDrawable()
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }
    if (callerBackgroundUrl.isNotBlank()) {
      root.addView(ImageView(this).apply {
        scaleType = ImageView.ScaleType.CENTER_CROP
        alpha = 0f
        layoutParams = FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
        loadRemoteImage(callerBackgroundUrl, this)
      })
      root.addView(View(this).apply {
        background = callerPhotoOverlayDrawable()
        layoutParams = FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      })
    } else {
      val backgroundResourceId = resources.getIdentifier(
        backgroundMode.imageResourceName,
        "drawable",
        packageName,
      )
      if (backgroundResourceId != 0) {
        root.addView(ImageView(this).apply {
          scaleType = ImageView.ScaleType.CENTER_CROP
          setImageResource(backgroundResourceId)
          layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
        })
        root.addView(View(this).apply {
          background = photoOverlayDrawable(backgroundMode)
          layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
        })
      } else {
        root.addView(CallBackgroundView(this, backgroundMode))
      }
    }

    val content = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(horizontalContentPadding(), callContentTopPadding(), horizontalContentPadding(), callContentBottomPadding())
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    content.addView(callTitleView(titleText, titleIcon))

    content.addView(TextView(this).apply {
      text = "\u0110ang g\u1ecdi \u0111\u1ebfn..."
      textSize = 16f
      setTextColor(Color.rgb(198, 210, 231))
      gravity = Gravity.CENTER
      includeFontPadding = false
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dp(9)
      }
    })

    content.addView(createAvatarBlock(callerName, avatarUrl))

    content.addView(TextView(this).apply {
      text = callerName
      textSize = if (isCompactCallLayout()) 29f else 34f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      maxLines = 2
      includeFontPadding = false
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dp(if (isCompactCallLayout()) 18 else 26)
      }
    })

    content.addView(statusPill())

    content.addView(TextView(this).apply {
      text = callDescription
      textSize = 15f
      setTextColor(Color.rgb(221, 228, 239))
      gravity = Gravity.CENTER
      includeFontPadding = false
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dp(
          when {
            isVeryCompactCallLayout() -> 14
            isCompactCallLayout() -> 20
            else -> 28
          },
        )
      }
    })

    content.addView(View(this).apply {
      layoutParams = LinearLayout.LayoutParams(1, 0, 1f)
    })

    content.addView(utilityActions())
    content.addView(createModernCallActions(isAudioCall))

    root.addView(content)
    applySystemBarAwarePadding(root, content)
    setContentView(root)

    // The fullscreen activity is now the call surface; remove the heads-up card
    // so the lock-screen UI does not show two incoming-call layers at once.
    cancelNotification()
    startRingtone()
  }

  private fun screenWidthDp(): Float {
    return resources.displayMetrics.widthPixels / resources.displayMetrics.density
  }

  private fun screenHeightDp(): Float {
    return resources.displayMetrics.heightPixels / resources.displayMetrics.density
  }

  private fun isNarrowCallLayout(): Boolean = screenWidthDp() < 360f

  private fun isCompactCallLayout(): Boolean = screenHeightDp() < 760f

  private fun isVeryCompactCallLayout(): Boolean = screenHeightDp() < 680f

  private fun horizontalContentPadding(): Int = dp(if (isNarrowCallLayout()) 18 else 24)

  private fun callContentTopPadding(): Int = dp(
    when {
      isVeryCompactCallLayout() -> 34
      isCompactCallLayout() -> 46
      else -> 76
    },
  )

  private fun callContentBottomPadding(): Int = dp(
    when {
      isVeryCompactCallLayout() -> 18
      isCompactCallLayout() -> 22
      else -> 28
    },
  )

  private fun primaryActionSize(): Int = dp(
    when {
      isVeryCompactCallLayout() -> 74
      isNarrowCallLayout() -> 74
      isCompactCallLayout() -> 80
      else -> 88
    },
  )

  private fun primaryActionIconSize(): Int = dp(
    when {
      isNarrowCallLayout() -> 30
      isCompactCallLayout() -> 32
      else -> 35
    },
  )

  private fun answerHandleSize(): Int = (primaryActionSize() - dp(10)).coerceAtLeast(dp(64))

  private fun secondaryActionSize(): Int = dp(
    when {
      isVeryCompactCallLayout() -> 56
      isNarrowCallLayout() -> 58
      isCompactCallLayout() -> 62
      else -> 66
    },
  )

  private fun secondaryActionIconSize(): Int = dp(
    when {
      isNarrowCallLayout() -> 23
      isCompactCallLayout() -> 25
      else -> 26
    },
  )

  private fun applySystemBarAwarePadding(root: View, content: LinearLayout) {
    fun update(topInset: Int, bottomInset: Int) {
      val horizontal = horizontalContentPadding()
      val topPadding = maxOf(callContentTopPadding(), topInset + dp(if (isCompactCallLayout()) 14 else 22))
      val bottomPadding = maxOf(callContentBottomPadding(), bottomInset + dp(18))
      content.setPadding(horizontal, topPadding, horizontal, bottomPadding)
    }

    update(0, 0)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
      root.setOnApplyWindowInsetsListener { _, insets ->
        val topInset: Int
        val bottomInset: Int
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          val statusInsets = insets.getInsets(WindowInsets.Type.statusBars())
          val navigationInsets = insets.getInsets(WindowInsets.Type.navigationBars())
          topInset = statusInsets.top
          bottomInset = navigationInsets.bottom
        } else {
          @Suppress("DEPRECATION")
          topInset = insets.systemWindowInsetTop
          @Suppress("DEPRECATION")
          bottomInset = insets.systemWindowInsetBottom
        }
        update(topInset, bottomInset)
        insets
      }
      root.requestApplyInsets()
    }
  }

  override fun onNewIntent(nextIntent: Intent) {
    super.onNewIntent(nextIntent)
    setIntent(nextIntent)
    finishIfIncomingCallWasHandled()
  }

  private fun finishIfIncomingCallWasHandled(): Boolean {
    val callId = extra(LiveKitCallNativeActions.EXTRA_CALL_ID)
    if (!LiveKitCallNativeActions.isIncomingCallHandledRecently(this, callId)) {
      return false
    }
    stopRingtone()
    cancelNotification()
    finishAndRemoveTask()
    return true
  }

  override fun onDestroy() {
    stopRingtone()
    dismissReceiver?.let { receiver ->
      try {
        unregisterReceiver(receiver)
      } catch (_: Throwable) {
      }
    }
    dismissReceiver = null
    super.onDestroy()
  }

  private fun createAvatarBlock(name: String, avatarUrl: String): FrameLayout {
    val size = dp(
      when {
        isVeryCompactCallLayout() -> 136
        isCompactCallLayout() -> 152
        else -> 176
      },
    )
    val avatarSize = dp(
      when {
        isVeryCompactCallLayout() -> 104
        isCompactCallLayout() -> 116
        else -> 134
      },
    )
    val block = FrameLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(size, size).apply {
        topMargin = dp(
          when {
            isVeryCompactCallLayout() -> 28
            isCompactCallLayout() -> 38
            else -> 56
          },
        )
      }
    }
    block.addView(RingView(this).apply {
      layoutParams = FrameLayout.LayoutParams(size, size, Gravity.CENTER)
    })

    val avatarContainer = FrameLayout(this).apply {
      background = ovalBorder(Color.rgb(231, 238, 255), Color.rgb(96, 91, 255), dp(4))
      clipToOutline = true
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) {
          outline.setOval(0, 0, view.width, view.height)
        }
      }
      layoutParams = FrameLayout.LayoutParams(avatarSize, avatarSize, Gravity.CENTER)
    }

    val fallback = TextView(this).apply {
      text = name.trim().take(1).ifBlank { "V" }.uppercase()
      textSize = 48f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.rgb(20, 57, 135))
      gravity = Gravity.CENTER
      background = GradientDrawable(
        GradientDrawable.Orientation.TL_BR,
        intArrayOf(Color.rgb(236, 243, 255), Color.rgb(212, 225, 255)),
      ).apply {
        shape = GradientDrawable.OVAL
      }
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }
    avatarContainer.addView(fallback)

    if (avatarUrl.isNotBlank()) {
      val image = ImageView(this).apply {
        scaleType = ImageView.ScaleType.CENTER_CROP
        alpha = 0f
        layoutParams = FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      }
      avatarContainer.addView(image)
      loadAvatar(avatarUrl, image)
    }

    block.addView(avatarContainer)
    block.addView(View(this).apply {
      background = ovalBorder(Color.rgb(31, 205, 75), Color.WHITE, dp(4))
      val onlineDotSize = dp(if (isCompactCallLayout()) 28 else 32)
      val onlineDotInset = dp(if (isCompactCallLayout()) 18 else 22)
      layoutParams = FrameLayout.LayoutParams(onlineDotSize, onlineDotSize, Gravity.RIGHT or Gravity.BOTTOM).apply {
        rightMargin = onlineDotInset
        bottomMargin = onlineDotInset
      }
    })
    return block
  }

  private fun loadAvatar(url: String, image: ImageView) {
    loadRemoteImage(url, image)
  }

  private fun loadRemoteImage(url: String, image: ImageView) {
    Thread {
      try {
        val connection = URL(url).openConnection().apply {
          connectTimeout = 3500
          readTimeout = 5000
        }
        val bitmap = connection.getInputStream().use { stream ->
          BitmapFactory.decodeStream(stream)
        } ?: return@Thread
        Handler(Looper.getMainLooper()).post {
          image.setImageBitmap(bitmap)
          image.animate().alpha(1f).setDuration(180L).start()
        }
      } catch (_: Throwable) {
      }
    }.start()
  }

  private fun callTitleView(title: String, iconRes: Int): LinearLayout {
    return LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
      addView(FrameLayout(this@IncomingCallActivity).apply {
        background = ovalBorder(Color.argb(52, 255, 255, 255), Color.argb(82, 255, 255, 255), dp(1))
        elevation = dp(5).toFloat()
        val titleIconCircle = dp(if (isCompactCallLayout()) 32 else 36)
        val titleIconSize = dp(if (isCompactCallLayout()) 17 else 19)
        layoutParams = LinearLayout.LayoutParams(titleIconCircle, titleIconCircle)
        addView(iconView(iconRes, titleIconSize).apply {
          layoutParams = FrameLayout.LayoutParams(titleIconSize, titleIconSize, Gravity.CENTER)
        })
      })
      addView(TextView(this@IncomingCallActivity).apply {
        text = title
        textSize = if (isCompactCallLayout()) 22f else 25f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        includeFontPadding = false
        maxLines = 1
        layoutParams = LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.WRAP_CONTENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply {
          leftMargin = dp(12)
        }
      })
    }
  }

  private fun callerBackgroundUrl(isGroupCall: Boolean, avatarUrl: String): String {
    val candidates = if (isGroupCall) {
      listOf(
        extra(LiveKitCallNativeActions.EXTRA_GROUP_COVER),
        extra(LiveKitCallNativeActions.EXTRA_COVER_URL),
        extra(LiveKitCallNativeActions.EXTRA_COVER),
        avatarUrl,
      )
    } else {
      listOf(
        extra(LiveKitCallNativeActions.EXTRA_CALLER_COVER),
        extra(LiveKitCallNativeActions.EXTRA_COVER_URL),
        extra(LiveKitCallNativeActions.EXTRA_COVER),
        avatarUrl,
      )
    }
    return candidates.firstOrNull { value ->
      value.startsWith("http://") || value.startsWith("https://")
    }.orEmpty()
  }

  private fun startRingtone() {
    val ringtoneUri = incomingRingtoneUri()
    try {
      ringtone = RingtoneManager.getRingtone(this, ringtoneUri)?.apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        }
        play()
      }
    } catch (_: Throwable) {
      ringtone = null
    }
  }

  private fun stopRingtone() {
    try {
      ringtone?.stop()
    } catch (_: Throwable) {
    }
    ringtone = null
  }

  private fun incomingRingtoneUri(): Uri {
    val customRingtoneId = resources.getIdentifier(
      INCOMING_CALL_RINGTONE_RES_NAME,
      "raw",
      packageName,
    )
    if (customRingtoneId != 0) {
      return Uri.parse("android.resource://$packageName/$customRingtoneId")
    }
    return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
  }

  private fun statusPill(): LinearLayout {
    return LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(dp(18), 0, dp(18), 0)
      background = roundRectBorder(Color.argb(46, 255, 255, 255), dp(22), Color.argb(46, 255, 255, 255), dp(1))
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        dp(if (isCompactCallLayout()) 34 else 38),
      ).apply {
        topMargin = dp(if (isCompactCallLayout()) 14 else 18)
      }
      addView(View(this@IncomingCallActivity).apply {
        background = oval(Color.rgb(34, 197, 94))
        layoutParams = LinearLayout.LayoutParams(dp(9), dp(9)).apply {
          rightMargin = dp(10)
        }
      })
      addView(TextView(this@IncomingCallActivity).apply {
        text = "Online"
        textSize = if (isCompactCallLayout()) 13f else 14f
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        includeFontPadding = false
      })
    }
  }

  private fun utilityActions(): LinearLayout {
    return LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        bottomMargin = dp(
          when {
            isVeryCompactCallLayout() -> 14
            isCompactCallLayout() -> 24
            else -> 34
          },
        )
      }
      addView(utilityButton(R.drawable.ic_call_message_modern, "Nh\u1eafn tin").apply {
        setOnClickListener { openMessageThread() }
      })
      addView(utilityButton(R.drawable.ic_call_volume_off_modern, "T\u1eaft chu\u00f4ng").apply {
        setOnClickListener {
          stopRingtone()
          alpha = 0.72f
          (getChildAt(0) as? FrameLayout)?.background =
            ovalBorder(Color.argb(66, 34, 197, 94), Color.argb(104, 255, 255, 255), dp(1))
          (getChildAt(1) as? TextView)?.text = "\u0110\u00e3 t\u1eaft"
        }
      })
    }
  }

  private fun utilityButton(iconRes: Int, label: String): LinearLayout {
    return LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
      addView(FrameLayout(this@IncomingCallActivity).apply {
        background = ovalBorder(Color.argb(52, 255, 255, 255), Color.argb(58, 255, 255, 255), dp(1))
        elevation = dp(6).toFloat()
        val buttonSize = secondaryActionSize()
        val iconSize = secondaryActionIconSize()
        layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize)
        addView(iconView(iconRes, iconSize).apply {
          layoutParams = FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER)
        })
      })
      addView(TextView(this@IncomingCallActivity).apply {
        text = label
        textSize = if (isCompactCallLayout()) 13f else 14f
        setTextColor(Color.rgb(232, 237, 247))
        gravity = Gravity.CENTER
        includeFontPadding = false
        layoutParams = LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
          topMargin = dp(if (isCompactCallLayout()) 8 else 10)
        }
      })
    }
  }

  private fun createModernCallActions(isAudioCall: Boolean): View {
    val mainButtonSize = primaryActionSize()
    val mainIconSize = primaryActionIconSize()
    val handleSize = answerHandleSize()
    val trackHeight = mainButtonSize

    val container = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, 0, 0, 0)
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        bottomMargin = 0
      }
    }

    val declineBtn = FrameLayout(this).apply {
      background = gradientOval(Color.rgb(255, 74, 87), Color.rgb(223, 39, 52))
      elevation = dp(10).toFloat()
      layoutParams = LinearLayout.LayoutParams(mainButtonSize, mainButtonSize).apply {
        rightMargin = dp(if (isNarrowCallLayout()) 12 else 16)
      }
      addView(iconView(R.drawable.ic_call_phone_modern, mainIconSize).apply {
        layoutParams = FrameLayout.LayoutParams(mainIconSize, mainIconSize, Gravity.CENTER)
      })
      setOnClickListener {
        LiveKitCallNativeActions.markIncomingCallHandled(
          this@IncomingCallActivity,
          extra(LiveKitCallNativeActions.EXTRA_CALL_ID),
        )
        stopRingtone()
        cancelNotification()
        LiveKitCallNativeActions.postAction(
          extra(LiveKitCallNativeActions.EXTRA_API_URL),
          extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
          "decline",
          extra(LiveKitCallNativeActions.EXTRA_CLIENT_ENDPOINT_ID),
        )
        finishAndRemoveTask()
      }
    }
    container.addView(declineBtn)

    val sliderTrack = FrameLayout(this).apply {
      background = gradientRoundRect(
        Color.argb(76, 255, 255, 255),
        Color.argb(42, 255, 255, 255),
        trackHeight / 2,
        Color.argb(58, 255, 255, 255),
        dp(1),
      )
      elevation = dp(8).toFloat()
      layoutParams = LinearLayout.LayoutParams(
        0,
        trackHeight,
        1f
      )
    }

    val promptText = TextView(this).apply {
      text = "Tr\u01b0\u1ee3t \u0111\u1ec3 tr\u1ea3 l\u1eddi" // "Trượt để trả lời"
      textSize = if (isNarrowCallLayout()) 13f else 14.5f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      ).apply {
        leftMargin = handleSize + dp(8)
        rightMargin = dp(if (isNarrowCallLayout()) 32 else 42)
      }
    }
    sliderTrack.addView(promptText)

    val arrow = iconView(R.drawable.ic_call_arrow_right_modern, dp(18)).apply {
      alpha = 0.58f
      layoutParams = FrameLayout.LayoutParams(dp(18), dp(18), Gravity.RIGHT or Gravity.CENTER_VERTICAL).apply {
        rightMargin = dp(if (isNarrowCallLayout()) 13 else 18)
      }
    }
    sliderTrack.addView(arrow)

    val handle = FrameLayout(this).apply {
      background = gradientOval(Color.rgb(60, 222, 91), Color.rgb(22, 180, 86))
      elevation = dp(10).toFloat()
      layoutParams = FrameLayout.LayoutParams(
        handleSize,
        handleSize,
        Gravity.LEFT or Gravity.CENTER_VERTICAL
      ).apply {
        leftMargin = (trackHeight - handleSize) / 2
      }
      addView(iconView(if (isAudioCall) R.drawable.ic_call_phone_modern else R.drawable.ic_call_video_modern, mainIconSize).apply {
        layoutParams = FrameLayout.LayoutParams(mainIconSize, mainIconSize, Gravity.CENTER)
      })
    }
    sliderTrack.addView(handle)

    var initialX = 0f
    var startTranslationX = 0f
    var isAnswered = false

    handle.setOnTouchListener(object : View.OnTouchListener {
      override fun onTouch(v: View, event: MotionEvent): Boolean {
        if (isAnswered) return false
        val maxSlide = (sliderTrack.width - v.width - (trackHeight - handleSize)).coerceAtLeast(1)

        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            initialX = event.rawX
            startTranslationX = v.translationX
            v.parent.requestDisallowInterceptTouchEvent(true)
            return true
          }
          MotionEvent.ACTION_MOVE -> {
            val deltaX = event.rawX - initialX
            var nextTranslationX = startTranslationX + deltaX
            if (nextTranslationX < 0f) nextTranslationX = 0f
            if (nextTranslationX > maxSlide) nextTranslationX = maxSlide.toFloat()
            v.translationX = nextTranslationX

            val progress = nextTranslationX / maxSlide
            promptText.alpha = 1f - progress
            arrow.alpha = 0.58f * (1f - progress)
            return true
          }
          MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
            if (v.translationX >= maxSlide * 0.82f) {
              isAnswered = true
              v.animate()
                .translationX(maxSlide.toFloat())
                .setDuration(120L)
                .withEndAction {
                  LiveKitCallNativeActions.markIncomingCallHandled(
                    this@IncomingCallActivity,
                    extra(LiveKitCallNativeActions.EXTRA_CALL_ID),
                  )
                  stopRingtone()
                  cancelNotification()
                  LiveKitCallNativeActions.postAction(
                    extra(LiveKitCallNativeActions.EXTRA_API_URL),
                    extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
                    "answer",
                    extra(LiveKitCallNativeActions.EXTRA_CLIENT_ENDPOINT_ID),
                  )
                  startActivity(Intent(this@IncomingCallActivity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtras(intent)
                    putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "answer")
                  })
                  finish()
                }
                .start()
            } else {
              v.animate()
                .translationX(0f)
                .setDuration(220L)
                .start()
              promptText.animate()
                .alpha(1f)
                .setDuration(220L)
                .start()
              arrow.animate()
                .alpha(0.58f)
                .setDuration(220L)
                .start()
            }
            return true
          }
          else -> return false
        }
      }
    })

    container.addView(sliderTrack)
    return container
  }

  private fun openMessageThread() {
    LiveKitCallNativeActions.markIncomingCallHandled(
      this,
      extra(LiveKitCallNativeActions.EXTRA_CALL_ID),
    )
    stopRingtone()
    cancelNotification()
    LiveKitCallNativeActions.postAction(
      extra(LiveKitCallNativeActions.EXTRA_API_URL),
      extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
      "decline",
      extra(LiveKitCallNativeActions.EXTRA_CLIENT_ENDPOINT_ID),
    )
    startActivity(Intent(this@IncomingCallActivity, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtras(intent)
      putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "message")
    })
    finish()
  }

  private fun registerDismissReceiver() {
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, dismissIntent: Intent?) {
        val dismissedCallId =
          dismissIntent?.getStringExtra(LiveKitCallNativeActions.EXTRA_CALL_ID).orEmpty()
        val currentCallId = extra(LiveKitCallNativeActions.EXTRA_CALL_ID)
        if (dismissedCallId.isNotBlank() && dismissedCallId != currentCallId) return
        stopRingtone()
        cancelNotification()
        finishAndRemoveTask()
      }
    }
    dismissReceiver = receiver
    val filter = IntentFilter(LiveKitCallNativeActions.ACTION_DISMISS_INCOMING_CALL)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      registerReceiver(receiver, filter)
    }
  }

  private fun oval(color: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
    }
  }

  private fun ovalBorder(color: Int, strokeColor: Int, strokeWidth: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
      setStroke(strokeWidth, strokeColor)
    }
  }

  private fun roundRect(color: Int, radius: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = radius.toFloat()
      setColor(color)
    }
  }

  private fun roundRectBorder(color: Int, radius: Int, strokeColor: Int, strokeWidth: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = radius.toFloat()
      setColor(color)
      setStroke(strokeWidth, strokeColor)
    }
  }

  private fun gradientOval(startColor: Int, endColor: Int): GradientDrawable {
    return GradientDrawable(
      GradientDrawable.Orientation.TL_BR,
      intArrayOf(startColor, endColor),
    ).apply {
      shape = GradientDrawable.OVAL
    }
  }

  private fun gradientRoundRect(
    startColor: Int,
    endColor: Int,
    radius: Int,
    strokeColor: Int,
    strokeWidth: Int,
  ): GradientDrawable {
    return GradientDrawable(
      GradientDrawable.Orientation.LEFT_RIGHT,
      intArrayOf(startColor, endColor),
    ).apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = radius.toFloat()
      setStroke(strokeWidth, strokeColor)
    }
  }

  private fun iconView(iconRes: Int, size: Int): ImageView {
    return ImageView(this).apply {
      setImageResource(iconRes)
      scaleType = ImageView.ScaleType.CENTER_INSIDE
      layoutParams = ViewGroup.LayoutParams(size, size)
    }
  }

  private fun photoOverlayDrawable(mode: CallBackgroundMode): GradientDrawable {
    return GradientDrawable(
      GradientDrawable.Orientation.TOP_BOTTOM,
      intArrayOf(
        mode.overlayTop,
        Color.argb(26, 0, 0, 0),
        mode.overlayBottom,
      ),
    )
  }

  private fun callerPhotoOverlayDrawable(): GradientDrawable {
    return GradientDrawable(
      GradientDrawable.Orientation.TOP_BOTTOM,
      intArrayOf(
        Color.argb(160, 2, 9, 24),
        Color.argb(74, 2, 9, 24),
        Color.argb(230, 0, 4, 13),
      ),
    )
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

  private fun currentBackgroundMode(): CallBackgroundMode {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when (hour) {
      in 5..11 -> CallBackgroundMode.MORNING
      in 12..17 -> CallBackgroundMode.AFTERNOON
      else -> CallBackgroundMode.NIGHT
    }
  }

  private enum class CallBackgroundMode(
    val imageResourceName: String,
    val skyColors: IntArray,
    val sunColor: Int,
    val mountainNear: Int,
    val mountainFar: Int,
    val waterColor: Int,
    val overlayTop: Int,
    val overlayBottom: Int,
  ) {
    MORNING(
      "incoming_call_bg_morning",
      intArrayOf(Color.rgb(73, 146, 214), Color.rgb(180, 219, 245), Color.rgb(255, 231, 185)),
      Color.rgb(255, 222, 128),
      Color.rgb(24, 79, 87),
      Color.rgb(54, 116, 130),
      Color.rgb(59, 143, 179),
      Color.argb(112, 4, 18, 38),
      Color.argb(180, 1, 10, 24),
    ),
    AFTERNOON(
      "incoming_call_bg_afternoon",
      intArrayOf(Color.rgb(45, 74, 105), Color.rgb(238, 139, 84), Color.rgb(32, 65, 71)),
      Color.rgb(255, 146, 71),
      Color.rgb(20, 58, 50),
      Color.rgb(50, 82, 73),
      Color.rgb(157, 84, 55),
      Color.argb(120, 11, 16, 24),
      Color.argb(200, 1, 7, 14),
    ),
    NIGHT(
      "incoming_call_bg_night",
      intArrayOf(Color.rgb(4, 18, 43), Color.rgb(13, 41, 79), Color.rgb(1, 8, 23)),
      Color.rgb(231, 240, 255),
      Color.rgb(5, 30, 47),
      Color.rgb(12, 51, 79),
      Color.rgb(7, 35, 66),
      Color.argb(92, 1, 8, 24),
      Color.argb(220, 0, 3, 12),
    );

    fun fallbackDrawable(): GradientDrawable {
      return GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, skyColors)
    }
  }

  private class RingView(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = 2f
    }

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      val centerX = width / 2f
      val centerY = height / 2f
      val maxRadius = minOf(width, height) / 2f - 3f
      for (index in 0 until 5) {
        paint.color = Color.argb(54 - index * 8, 116, 112, 255)
        canvas.drawCircle(centerX, centerY, maxRadius - index * 17f, paint)
      }
    }
  }

  private class CallBackgroundView(
    context: Context,
    private val mode: CallBackgroundMode,
  ) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      paint.shader = LinearGradient(
        0f,
        0f,
        width.toFloat(),
        height.toFloat(),
        mode.skyColors,
        null,
        Shader.TileMode.CLAMP,
      )
      canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
      paint.shader = null
      paint.style = Paint.Style.FILL
      drawScene(canvas)
      paint.shader = LinearGradient(
        0f,
        0f,
        0f,
        height.toFloat(),
        intArrayOf(mode.overlayTop, Color.argb(32, 0, 0, 0), mode.overlayBottom),
        null,
        Shader.TileMode.CLAMP,
      )
      canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
      paint.shader = null
      paint.color = Color.argb(32, 255, 255, 255)
      canvas.drawCircle(width * 0.14f, height * 0.13f, width * 0.24f, paint)
      paint.color = Color.argb(28, 74, 115, 255)
      canvas.drawCircle(width * 0.84f, height * 0.26f, width * 0.34f, paint)
    }

    private fun drawScene(canvas: Canvas) {
      val w = width.toFloat()
      val h = height.toFloat()
      paint.color = Color.argb(210, Color.red(mode.sunColor), Color.green(mode.sunColor), Color.blue(mode.sunColor))
      canvas.drawCircle(w * 0.74f, h * 0.28f, w * 0.13f, paint)

      paint.color = mode.mountainFar
      val farPath = android.graphics.Path().apply {
        moveTo(0f, h * 0.58f)
        lineTo(w * 0.18f, h * 0.41f)
        lineTo(w * 0.35f, h * 0.58f)
        lineTo(w * 0.52f, h * 0.37f)
        lineTo(w * 0.76f, h * 0.58f)
        lineTo(w, h * 0.43f)
        lineTo(w, h * 0.68f)
        lineTo(0f, h * 0.68f)
        close()
      }
      canvas.drawPath(farPath, paint)

      paint.color = mode.mountainNear
      val nearPath = android.graphics.Path().apply {
        moveTo(0f, h * 0.66f)
        lineTo(w * 0.23f, h * 0.48f)
        lineTo(w * 0.47f, h * 0.67f)
        lineTo(w * 0.68f, h * 0.49f)
        lineTo(w, h * 0.68f)
        lineTo(w, h)
        lineTo(0f, h)
        close()
      }
      canvas.drawPath(nearPath, paint)

      paint.shader = LinearGradient(
        0f,
        h * 0.62f,
        0f,
        h,
        intArrayOf(Color.argb(170, Color.red(mode.waterColor), Color.green(mode.waterColor), Color.blue(mode.waterColor)), Color.argb(230, 2, 12, 24)),
        null,
        Shader.TileMode.CLAMP,
      )
      canvas.drawRect(0f, h * 0.62f, w, h, paint)
      paint.shader = null

      paint.color = Color.argb(38, 255, 255, 255)
      paint.strokeWidth = 2f
      for (index in 0..8) {
        val y = h * (0.66f + index * 0.032f)
        canvas.drawLine(w * 0.18f, y, w * 0.82f, y + index * 1.6f, paint)
      }
    }
  }
}
