using NUnit.Framework;
using RTLTMPro;

namespace FootballQuest.Tests.Core
{
    /// <summary>
    /// يتأكد إن RTLTMPro (المضمّنة في ThirdParty) تشكّل الحروف العربية بأشكالها المتصلة (Presentation Forms)
    /// وتعكس الترتيب للعرض، وتحافظ على الأرقام واللاتيني (AT-11). يُبنى خارج Unity لأن منطق التشكيل C# نقي.
    /// </summary>
    public class RtlShapingTests
    {
        private static string Fix(string input)
        {
            var output = new FastStringBuilder(RTLSupport.DefaultBufferSize);
            RTLSupport.FixRTL(input, output, farsi: false, fixTextTags: true, preserveNumbers: true);
            return output.ToString();
        }

        [Test]
        public void ConnectsArabicLetters()
        {
            var fixedText = Fix("جدة");
            Assert.That(fixedText.Length, Is.EqualTo(3));
            foreach (var c in fixedText)
            {
                Assert.That(TextUtils.IsArabicPresentationForm(c) || c == 'ة' || c == 'ﺔ' || c == 'ﺓ', Is.True, ((int)c).ToString("X"));
            }
            Assert.That(fixedText, Is.Not.EqualTo("جدة"));
        }

        [Test]
        public void KeepsLatinCodesAndDigitsReadable()
        {
            var fixedText = Fix("منتخب KSA رقم 27");
            Assert.That(fixedText, Does.Contain("KSA"));
            Assert.That(fixedText, Does.Contain("27"));
        }

        [Test]
        public void LeavesPureLatinUntouched()
        {
            Assert.That(TextUtils.IsRTLInput("Football Quest"), Is.False);
            Assert.That(TextUtils.IsRTLInput("لعبة"), Is.True);
        }
    }
}
