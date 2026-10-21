using System;
using FootballQuest.Core.Qr;
using UnityEngine;
using UnityEngine.UI;

namespace FootballQuest.App.UI
{
    /// <summary>عرض QR (رمز الاسترداد) كـ RawImage حادّ البكسلات.</summary>
    public static class QrView
    {
        public static RawImage Build(Transform parent, string text, float size)
        {
            var modules = QrCodec.Encode(text, 256);
            var w = modules.GetLength(0);
            var h = modules.GetLength(1);
            var texture = new Texture2D(w, h, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
            var pixels = new Color32[w * h];
            for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++)
                pixels[(h - 1 - y) * w + x] = modules[x, y] ? new Color32(10, 10, 10, 255) : new Color32(255, 255, 255, 255);
            texture.SetPixels32(pixels);
            texture.Apply(false, true);

            var rt = UiFactory.Rect(parent, "QR");
            var image = rt.gameObject.AddComponent<RawImage>();
            image.texture = texture;
            var le = UiFactory.Size(rt, size, size);
            le.preferredWidth = size;
            return image;
        }
    }

    /// <summary>
    /// معاينة الكاميرا الخلفية وقراءة QR كل 0.3 ث (WebCamTexture + ZXing). تُستدعى بعد إذن الكاميرا فقط (PERM_CAM_PRE).
    /// </summary>
    public sealed class QrScanner : MonoBehaviour
    {
        private const float DecodeInterval = 0.3f;

        private WebCamTexture camera;
        private RawImage preview;
        private AspectRatioFitter fitter;
        private Action<string> onCode;
        private float nextDecode;
        private Color32[] buffer;
        private byte[] rgba;

        public static QrScanner Create(Transform parent, Action<string> onCode)
        {
            var rt = UiFactory.Rect(parent, "Scanner");
            UiFactory.Size(rt, 900f, 900f, 1f);
            rt.gameObject.AddComponent<RectMask2D>();
            var view = UiFactory.Rect(rt, "Preview");
            var scanner = rt.gameObject.AddComponent<QrScanner>();
            scanner.preview = view.gameObject.AddComponent<RawImage>();
            scanner.fitter = view.gameObject.AddComponent<AspectRatioFitter>();
            scanner.fitter.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent;
            scanner.onCode = onCode;
            scanner.StartCamera();
            return scanner;
        }

        private void StartCamera()
        {
            string device = null;
            foreach (var d in WebCamTexture.devices)
            {
                if (!d.isFrontFacing) { device = d.name; break; }
            }
            camera = device != null ? new WebCamTexture(device, 1280, 720, 30) : new WebCamTexture(1280, 720, 30);
            preview.texture = camera;
            camera.Play();
        }

        private void Update()
        {
            if (camera == null || !camera.isPlaying || camera.width < 32) return;
            // اتجاه المعاينة حسب دوران الكاميرا.
            preview.rectTransform.localEulerAngles = new Vector3(0f, 0f, -camera.videoRotationAngle);
            fitter.aspectRatio = (float)camera.width / camera.height;
            if (Time.unscaledTime < nextDecode) return;
            nextDecode = Time.unscaledTime + DecodeInterval;

            var count = camera.width * camera.height;
            if (buffer == null || buffer.Length != count)
            {
                buffer = new Color32[count];
                rgba = new byte[count * 4];
            }
            camera.GetPixels32(buffer);
            for (var i = 0; i < count; i++)
            {
                var c = buffer[i];
                var j = i * 4;
                rgba[j] = c.r; rgba[j + 1] = c.g; rgba[j + 2] = c.b; rgba[j + 3] = c.a;
            }
            var text = QrCodec.Decode(rgba, camera.width, camera.height);
            if (text == null) return;
            Stop();
            onCode?.Invoke(text);
        }

        public void Stop()
        {
            if (camera != null && camera.isPlaying) camera.Stop();
        }

        private void OnDestroy() => Stop();
    }
}
