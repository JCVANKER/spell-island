package com.ncjng.spellisland;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.system.Os;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Native side of 咒语岛 on Android:
 *  - config(): keys and update settings baked in at build time (kept out of the web code, so hot updates are keyless)
 *  - downloadUpdate(): assemble a new web build in app storage — unchanged files copied from the current build,
 *    changed files downloaded and verified (sha256)
 *  - applyUpdate(): serve the new build (persisted like Capacitor's own WebView plugin; reset when a new APK is installed)
 *  - installApk(): download a new APK, verify it and open the system installer
 */
@CapacitorPlugin(name = "SpellNative")
public class SpellNativePlugin extends Plugin {
    private static final String PREFS = "CapWebViewSettings";
    private static final String KEY = "serverBasePath";

    @PluginMethod
    public void config(PluginCall call) {
        JSObject o = new JSObject();
        o.put("speechKey", BuildConfig.SPELL_SPEECH_KEY);
        o.put("arkKey", BuildConfig.SPELL_ARK_KEY);
        o.put("arkModel", BuildConfig.SPELL_ARK_MODEL);
        o.put("updateUrl", BuildConfig.SPELL_UPDATE_URL);
        o.put("appToken", BuildConfig.SPELL_APP_TOKEN);
        o.put("shellVersion", BuildConfig.VERSION_NAME);
        o.put("versionCode", BuildConfig.VERSION_CODE);
        o.put("basePath", getBridge().getServerBasePath());
        call.resolve(o);
    }

    // ---------------------------------------------------------------- http
    private List<String> bases(String url) {
        List<String> b = new ArrayList<>();
        b.add(url);
        if (url.startsWith("https://")) b.add("http://" + url.substring(8));
        return b;
    }

    private HttpURLConnection open(String base, String rel, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(base + "/" + rel).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(60000);
        c.setRequestProperty("X-Spell-App", token);
        if (c.getResponseCode() != 200) { int code = c.getResponseCode(); c.disconnect(); throw new Exception("HTTP " + code + " " + rel); }
        return c;
    }

    private byte[] fetch(List<String> bases, String rel, String token) throws Exception {
        Exception last = null;
        for (String b : bases) {
            try {
                HttpURLConnection c = open(b, rel, token);
                try (InputStream in = c.getInputStream()) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[65536]; int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    return out.toByteArray();
                } finally { c.disconnect(); }
            } catch (Exception e) { last = e; }
        }
        throw last;
    }

    private static String hex(byte[] d) { StringBuilder s = new StringBuilder(); for (byte x : d) s.append(String.format("%02x", x)); return s.toString(); }
    private static String sha256(byte[] b) throws Exception { return hex(MessageDigest.getInstance("SHA-256").digest(b)); }

    // ---------------------------------------------------------------- current build
    private boolean currentIsAssets() { String p = getBridge().getServerBasePath(); return p == null || !p.startsWith("/"); }

    private InputStream openCurrent(String rel) throws Exception {
        if (currentIsAssets()) return getContext().getAssets().open("public/" + rel);
        return new FileInputStream(new File(getBridge().getServerBasePath(), rel));
    }

    private JSONObject currentManifest() {
        try (InputStream in = openCurrent("update-manifest.json")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buf = new byte[65536]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return new JSONObject(out.toString("UTF-8"));
        } catch (Exception e) { return null; }
    }

    private static void copy(InputStream in, File dst) throws Exception {
        dst.getParentFile().mkdirs();
        try (InputStream i = in; OutputStream o = new FileOutputStream(dst)) { byte[] buf = new byte[262144]; int n; while ((n = i.read(buf)) > 0) o.write(buf, 0, n); }
    }

    private static void rm(File f) { if (f.isDirectory()) { File[] l = f.listFiles(); if (l != null) for (File c : l) rm(c); } f.delete(); }

    // ---------------------------------------------------------------- hot update
    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        final String url = call.getString("url"), token = call.getString("token", ""), rel = call.getString("manifest");
        if (url == null || rel == null) { call.reject("url and manifest required"); return; }
        call.setKeepAlive(true);
        new Thread(() -> {
            try {
                List<String> bs = bases(url);
                JSONObject m = new JSONObject(new String(fetch(bs, rel, token), "UTF-8"));
                String build = m.getString("build");
                JSONObject files = m.getJSONObject("files");
                JSONObject cur = currentManifest();
                Map<String, String> curByHash = new HashMap<>();
                if (cur != null) { JSONObject cf = cur.getJSONObject("files"); Iterator<String> it = cf.keys(); while (it.hasNext()) { String k = it.next(); curByHash.put(cf.getJSONArray(k).getString(0), k); } }
                File root = new File(getContext().getFilesDir(), "web");
                File staging = new File(root, ".staging-" + build);
                rm(staging); staging.mkdirs();
                List<String[]> need = new ArrayList<>();
                long total = 0;
                Iterator<String> it = files.keys();
                while (it.hasNext()) {
                    String path = it.next(); JSONArray v = files.getJSONArray(path);
                    String h = v.getString(0); long size = v.getLong(1);
                    String src = curByHash.get(h);
                    File dst = new File(staging, path);
                    if (src != null) {
                        boolean linked = false;
                        if (!currentIsAssets()) { try { dst.getParentFile().mkdirs(); Os.link(new File(getBridge().getServerBasePath(), src).getAbsolutePath(), dst.getAbsolutePath()); linked = true; } catch (Exception ignored) {} }
                        if (!linked) copy(openCurrent(src), dst);
                    } else { need.add(new String[] { path, h, String.valueOf(size) }); total += size; }
                }
                final long totalBytes = Math.max(1, total);
                final AtomicLong got = new AtomicLong();
                ExecutorService pool = Executors.newFixedThreadPool(4);
                List<Future<?>> fs = new ArrayList<>();
                for (String[] n : need) {
                    fs.add(pool.submit(() -> {
                        byte[] b = fetch(bs, "web/blobs/" + n[1], token);
                        if (!sha256(b).equals(n[1])) throw new Exception("hash mismatch " + n[0]);
                        File dst = new File(staging, n[0]); dst.getParentFile().mkdirs();
                        try (FileOutputStream o = new FileOutputStream(dst)) { o.write(b); }
                        long g = got.addAndGet(Long.parseLong(n[2]));
                        JSObject p = new JSObject(); p.put("progress", (double) g / totalBytes); notifyListeners("progress", p);
                        return null;
                    }));
                }
                try { for (Future<?> f : fs) f.get(); } finally { pool.shutdownNow(); }
                try (FileOutputStream o = new FileOutputStream(new File(staging, "update-manifest.json"))) { o.write(m.toString().getBytes("UTF-8")); }
                File fin = new File(root, build);
                rm(fin);
                if (!staging.renameTo(fin)) throw new Exception("could not finish the update");
                JSObject r = new JSObject(); r.put("dir", fin.getAbsolutePath()); r.put("build", build); r.put("downloaded", need.size());
                call.resolve(r);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        }).start();
    }

    @PluginMethod
    public void applyUpdate(PluginCall call) {
        String dir = call.getString("dir");
        if (dir == null || !new File(dir, "update-manifest.json").exists()) { call.reject("update not ready"); return; }
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        prefs.edit().putString(KEY, dir).apply();
        // remove older downloaded builds (keep this one)
        File root = new File(getContext().getFilesDir(), "web");
        File[] l = root.listFiles();
        String keepPrev = currentIsAssets() ? "" : getBridge().getServerBasePath();
        if (l != null) for (File f : l) if (!f.getAbsolutePath().equals(dir) && !f.getAbsolutePath().equals(keepPrev)) rm(f);
        call.resolve();
        getActivity().runOnUiThread(() -> getBridge().setServerBasePath(dir));
    }

    // ---------------------------------------------------------------- installer update
    @PluginMethod
    public void installApk(PluginCall call) {
        final String url = call.getString("url"), token = call.getString("token", ""), rel = call.getString("apk"), want = call.getString("sha256", "");
        if (url == null || rel == null) { call.reject("url and apk required"); return; }
        call.setKeepAlive(true);
        new Thread(() -> {
            try {
                File apk = new File(getContext().getCacheDir(), "spell-island-update.apk");
                Exception last = null; boolean ok = false;
                for (String b : bases(url)) {
                    try {
                        HttpURLConnection c = open(b, rel, token);
                        long size = c.getContentLengthLong(); long n = 0;
                        MessageDigest md = MessageDigest.getInstance("SHA-256");
                        try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(apk)) {
                            byte[] buf = new byte[262144]; int k;
                            while ((k = in.read(buf)) > 0) { o.write(buf, 0, k); md.update(buf, 0, k); n += k; if (size > 0) { JSObject p = new JSObject(); p.put("apkProgress", (double) n / size); notifyListeners("progress", p); } }
                        } finally { c.disconnect(); }
                        if (!want.isEmpty() && !hex(md.digest()).equals(want)) throw new Exception("installer hash mismatch");
                        ok = true; break;
                    } catch (Exception e) { last = e; }
                }
                if (!ok) throw last;
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        }).start();
    }
}
