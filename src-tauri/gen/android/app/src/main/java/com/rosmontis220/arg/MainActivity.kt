package com.rosmontis220.arg

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    insetContentFromSystemBars()
  }

  /**
   * wry installs the WebView by calling `setContentView(View)`, so this runs once the
   * content view exists. Re-applying the listener is idempotent.
   */
  override fun onContentChanged() {
    super.onContentChanged()
    insetContentFromSystemBars()
  }

  /**
   * Android 15 (API 35) and newer draw every app edge-to-edge, and an app targeting API
   * 35+ cannot opt out. Without this the WebView starts underneath the status bar, so the
   * top of the UI is partly hidden and the controls there cannot be tapped.
   *
   * wry attaches the RustWebView beneath `android.R.id.content`, which makes that frame an
   * ancestor of the WebView. Padding it by the system bar and display cutout insets shrinks
   * the WebView's measured bounds, so the web content is laid out strictly inside the safe
   * area - deterministic, unlike the newer opt-out flags that are simply ignored at this
   * targetSdk.
   *
   * `Activity.findViewById(android.R.id.content)` resolves the window's content frame (the
   * AppCompat decor is nested inside it), so this works whichever of the two identically-id'd
   * frames is found first. Returns quietly when no content view is installed yet.
   */
  private fun insetContentFromSystemBars() {
    val content = findViewById<View>(android.R.id.content) ?: return
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      insets
    }
    ViewCompat.requestApplyInsets(content)
  }
}