/** Browser text-to-speech. Capacitor later: @capacitor-community/text-to-speech. */
let enVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  enVoice =
    voices.find((v) => /en-(gb|us)/i.test(v.lang) && /natural|premium|enhanced|google/i.test(v.name)) ??
    voices.find((v) => /en-(gb|us)/i.test(v.lang)) ??
    voices[0] ??
    null;
}

if (typeof speechSynthesis !== 'undefined') {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const canSpeak = () => typeof speechSynthesis !== 'undefined';

export function speak(text: string, rate = 0.95) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = enVoice?.lang ?? 'en-GB';
  if (enVoice) u.voice = enVoice;
  u.rate = rate;
  speechSynthesis.speak(u);
}
