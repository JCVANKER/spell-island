package com.ncjng.spellisland;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

/** A tiny WebSocket bridge that can send custom headers (needed by Doubao streaming speech recognition). */
@CapacitorPlugin(name = "NativeWs")
public class NativeWsPlugin extends Plugin {
    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(20, TimeUnit.SECONDS)
            .build();
    private final ConcurrentHashMap<String, WebSocket> sockets = new ConcurrentHashMap<>();

    private void emit(String id, String type, String data, String message) {
        JSObject o = new JSObject();
        o.put("id", id);
        o.put("type", type);
        if (data != null) o.put("data", data);
        if (message != null) o.put("message", message);
        notifyListeners("ws", o);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        final String id = call.getString("id");
        String url = call.getString("url");
        JSObject headers = call.getObject("headers", new JSObject());
        if (id == null || url == null) { call.reject("id and url required"); return; }
        Request.Builder rb = new Request.Builder().url(url);
        Iterator<String> keys = headers.keys();
        while (keys.hasNext()) { String k = keys.next(); rb.addHeader(k, headers.optString(k)); }
        WebSocket ws = client.newWebSocket(rb.build(), new WebSocketListener() {
            @Override public void onOpen(WebSocket webSocket, Response response) { emit(id, "open", null, null); }
            @Override public void onMessage(WebSocket webSocket, ByteString bytes) { emit(id, "message", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP), null); }
            @Override public void onMessage(WebSocket webSocket, String text) { emit(id, "message", Base64.encodeToString(text.getBytes(), Base64.NO_WRAP), null); }
            @Override public void onClosing(WebSocket webSocket, int code, String reason) { webSocket.close(1000, null); }
            @Override public void onClosed(WebSocket webSocket, int code, String reason) { sockets.remove(id); emit(id, "closed", null, reason); }
            @Override public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                sockets.remove(id);
                String msg = t.getMessage();
                if (response != null) msg = "HTTP " + response.code() + " " + msg;
                emit(id, "error", null, msg);
            }
        });
        sockets.put(id, ws);
        call.resolve();
    }

    @PluginMethod
    public void send(PluginCall call) {
        WebSocket ws = sockets.get(call.getString("id", ""));
        String data = call.getString("data");
        if (ws == null || data == null) { call.reject("not connected"); return; }
        ws.send(ByteString.of(Base64.decode(data, Base64.NO_WRAP)));
        call.resolve();
    }

    @PluginMethod
    public void close(PluginCall call) {
        WebSocket ws = sockets.remove(call.getString("id", ""));
        if (ws != null) ws.close(1000, null);
        call.resolve();
    }
}
