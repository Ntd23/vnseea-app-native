const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Android navigation speech', () => {
  it('falls back from Google TTS and uses an audible media stream for Xiaomi devices', () => {
    const source = read(
      'android/app/src/main/java/com/vnseea/android/navigation/NavigationSpeechModule.kt',
    );

    expect(source).toContain('GOOGLE_TTS_ENGINE = "com.google.android.tts"');
    expect(source).toContain('fallbackToDefaultEngine("Google TTS init failed")');
    expect(source).toContain('TextToSpeech(reactContext.applicationContext, this)');
    expect(source).toContain('Locale("vi", "VN")');
    expect(source).toContain('Locale("vi")');
    expect(source).toContain('Locale.US');
    expect(source).toContain('.setUsage(AudioAttributes.USAGE_MEDIA)');
    expect(source).toContain(
      'TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC.toString()',
    );
  });
});
