package com.ncjng.spellisland;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeWsPlugin.class);
        registerPlugin(SpellNativePlugin.class);
        super.onCreate(savedInstanceState);
        // the game listens all the time: keep the screen on while playing
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // let audio (voices, the listening clips) play without a tap first
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
