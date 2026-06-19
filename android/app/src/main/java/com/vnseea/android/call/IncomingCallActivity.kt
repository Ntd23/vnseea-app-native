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
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.vnseea.android.MainActivity
import java.net.URL
import java.util.Calendar

class IncomingCallActivity : Activity() {
  private var dismissReceiver: BroadcastReceiver? = null
  private var ringtone: Ringtone? = null

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
    val title = if (isAudioCall) {
      "\u260e Cu\u1ed9c g\u1ecdi tho\u1ea1i"
    } else {
      "\u25a0 Cu\u1ed9c g\u1ecdi video"
    }
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
      setPadding(dp(28), dp(76), dp(28), dp(34))
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    content.addView(TextView(this).apply {
      text = title
      textSize = 21f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      includeFontPadding = false
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
    })

    content.addView(TextView(this).apply {
      text = "\u0110ang g\u1ecdi \u0111\u1ebfn..."
      textSize = 15f
      setTextColor(Color.rgb(186, 201, 225))
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
      textSize = 32f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      maxLines = 2
      includeFontPadding = false
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dp(26)
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
        topMargin = dp(28)
      }
    })

    content.addView(View(this).apply {
      layoutParams = LinearLayout.LayoutParams(1, 0, 1f)
    })

    content.addView(utilityActions())
    content.addView(createModernCallActions(isAudioCall))

    root.addView(content)
    setContentView(root)

    // The fullscreen activity is now the call surface; remove the heads-up card
    // so the lock-screen UI does not show two incoming-call layers at once.
    cancelNotification()
    startRingtone()
  }

  override fun onNewIntent(nextIntent: Intent) {
    super.onNewIntent(nextIntent)
    setIntent(nextIntent)
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
    val size = dp(176)
    val avatarSize = dp(134)
    val block = FrameLayout(this).apply {
      layoutParams = LinearLayout.LayoutParams(size, size).apply {
        topMargin = dp(56)
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
      layoutParams = FrameLayout.LayoutParams(dp(32), dp(32), Gravity.RIGHT or Gravity.BOTTOM).apply {
        rightMargin = dp(22)
        bottomMargin = dp(22)
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
      "incoming_call_ringtone",
      "raw",
      packageName,
    )
    if (customRingtoneId != 0) {
      return Uri.parse("android.resource://$packageName/$customRingtoneId")
    }
    return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
  }

  private fun statusPill(): TextView {
    return TextView(this).apply {
      text = "\u25cf  Online"
      textSize = 14f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      includeFontPadding = false
      background = roundRect(Color.argb(48, 255, 255, 255), dp(22))
      layoutParams = LinearLayout.LayoutParams(dp(110), dp(38)).apply {
        topMargin = dp(18)
      }
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
        bottomMargin = dp(44)
      }
      addView(utilityButton("\u2026", "Nh\u1eafn tin").apply {
        setOnClickListener { openMessageThread() }
      })
      addView(utilityButton("\u266a", "T\u1eaft chu\u00f4ng").apply {
        setOnClickListener {
          stopRingtone()
          alpha = 0.72f
          (getChildAt(1) as? TextView)?.text = "\u0110\u00e3 t\u1eaft"
        }
      })
    }
  }

  private fun utilityButton(icon: String, label: String): LinearLayout {
    return LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
      addView(TextView(this@IncomingCallActivity).apply {
        text = icon
        textSize = 30f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        background = oval(Color.argb(46, 255, 255, 255))
        layoutParams = LinearLayout.LayoutParams(dp(72), dp(72))
      })
      addView(TextView(this@IncomingCallActivity).apply {
        text = label
        textSize = 14f
        setTextColor(Color.rgb(232, 237, 247))
        gravity = Gravity.CENTER
        includeFontPadding = false
        layoutParams = LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.WRAP_CONTENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply {
          topMargin = dp(14)
        }
      })
    }
  }

  private fun createModernCallActions(isAudioCall: Boolean): View {
    val container = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(16), 0, dp(16), 0)
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        bottomMargin = dp(40)
      }
    }

    // 1. Decline Button
    val declineBtn = TextView(this).apply {
      text = "\u260e" // Phone icon
      textSize = 24f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = oval(Color.rgb(239, 57, 62)) // Red color
      elevation = dp(4).toFloat()
      layoutParams = LinearLayout.LayoutParams(dp(64), dp(64)).apply {
        rightMargin = dp(20)
      }
      setOnClickListener {
        stopRingtone()
        cancelNotification()
        LiveKitCallNativeActions.postAction(
          extra(LiveKitCallNativeActions.EXTRA_API_URL),
          extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
          "decline",
        )
        finishAndRemoveTask()
      }
    }
    container.addView(declineBtn)

    // 2. Slide to Answer
    val sliderTrack = FrameLayout(this).apply {
      background = roundRect(Color.argb(50, 255, 255, 255), dp(32))
      layoutParams = LinearLayout.LayoutParams(
        0,
        dp(64),
        1f
      )
    }

    val promptText = TextView(this).apply {
      text = "Tr\u01b0\u1ee3t \u0111\u1ec3 tr\u1ea3 l\u1eddi" // "Trượt để trả lời"
      textSize = 14f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      ).apply {
        leftMargin = dp(48) // Offset to not overlap with handle initially
        rightMargin = dp(12)
      }
    }
    sliderTrack.addView(promptText)

    val handle = TextView(this).apply {
      text = if (isAudioCall) "\u260e" else "\u25a0"
      textSize = 22f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = oval(Color.rgb(77, 213, 66)) // Green color
      layoutParams = FrameLayout.LayoutParams(
        dp(56),
        dp(56),
        Gravity.LEFT or Gravity.CENTER_VERTICAL
      ).apply {
        leftMargin = dp(4)
      }
    }
    sliderTrack.addView(handle)

    var initialX = 0f
    var startTranslationX = 0f
    var isAnswered = false

    handle.setOnTouchListener(object : View.OnTouchListener {
      override fun onTouch(v: View, event: MotionEvent): Boolean {
        if (isAnswered) return false
        val maxSlide = sliderTrack.width - v.width - dp(8)

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
            return true
          }
          MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
            if (v.translationX >= maxSlide * 0.82f) {
              isAnswered = true
              v.animate()
                .translationX(maxSlide.toFloat())
                .setDuration(120L)
                .withEndAction {
                  stopRingtone()
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
    stopRingtone()
    cancelNotification()
    LiveKitCallNativeActions.postAction(
      extra(LiveKitCallNativeActions.EXTRA_API_URL),
      extra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN),
      "decline",
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
