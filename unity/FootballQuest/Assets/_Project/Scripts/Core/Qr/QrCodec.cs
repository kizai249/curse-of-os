using ZXing;
using ZXing.Common;
using ZXing.QrCode;
using ZXing.QrCode.Internal;

namespace FootballQuest.Core.Qr
{
    /// <summary>
    /// QR بمكتبة ZXing.Net (Apache 2.0): قراءة رمز الفرع من إطار الكاميرا، وتوليد QR الاسترداد في المحفظة.
    /// بدون UnityEngine — الإطار بايتات RGBA32.
    /// </summary>
    public static class QrCodec
    {
        /// <summary>مصفوفة الوحدات (true = داكن) بحجم size × size مع هامش هادئ.</summary>
        public static bool[,] Encode(string text, int size)
        {
            var hints = new System.Collections.Generic.Dictionary<EncodeHintType, object>
            {
                { EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M },
                { EncodeHintType.MARGIN, 2 },
                { EncodeHintType.CHARACTER_SET, "UTF-8" },
            };
            var matrix = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, hints);
            var modules = new bool[matrix.Width, matrix.Height];
            for (var y = 0; y < matrix.Height; y++)
            for (var x = 0; x < matrix.Width; x++)
                modules[x, y] = matrix[x, y];
            return modules;
        }

        /// <summary>يقرأ QR من إطار RGBA32 (سطر 0 = أعلى أو أسفل، ما يفرق). يرجع null إذا ما فيه رمز.</summary>
        public static string Decode(byte[] rgba, int width, int height)
        {
            if (rgba == null || rgba.Length < width * height * 4) return null;
            var source = new RGBLuminanceSource(rgba, width, height, RGBLuminanceSource.BitmapFormat.RGBA32);
            var reader = new QRCodeReader();
            try
            {
                var hints = new System.Collections.Generic.Dictionary<DecodeHintType, object> { { DecodeHintType.TRY_HARDER, true } };
                return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints)?.Text;
            }
            catch (ReaderException)
            {
                return null;
            }
        }
    }
}
