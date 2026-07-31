#!/data/data/com.termux/files/usr/bin/bash
set -e
mkdir -p .github/workflows

cat > "twa-manifest.json" << 'VELOURA_EOF'
{
  "packageId": "io.github.islambrq.veloura",
  "host": "islambrq.github.io",
  "name": "Veloura",
  "launcherName": "Veloura",
  "display": "standalone",
  "themeColor": "#14171C",
  "navigationColor": "#14171C",
  "backgroundColor": "#EEEAE2",
  "startUrl": "/Veloura/",
  "iconUrl": "https://islambrq.github.io/Veloura/icons/icon-512.png",
  "maskableIconUrl": "https://islambrq.github.io/Veloura/icons/icon-512-maskable.png",
  "webManifestUrl": "https://islambrq.github.io/Veloura/manifest.webmanifest",
  "shortcuts": [],
  "signingKey": {
    "path": "./android.keystore",
    "alias": "veloura"
  },
  "appVersion": "1",
  "appVersionCode": 1,
  "fallbackType": "customtabs",
  "features": {},
  "alphaDependencies": { "enabled": false },
  "enableNotifications": false,
  "isChromeOSOnly": false,
  "orientation": "portrait"
}
VELOURA_EOF

cat > ".github/workflows/build-apk.yml" << 'VELOURA_EOF'
name: Build Android APK

# Manual trigger only — this doesn't need to run on every push, just when you
# actually want a fresh APK. Go to the Actions tab and click "Run workflow".
on:
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Set up Android SDK
        uses: android-actions/setup-android@v3

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Bubblewrap CLI
        run: npm install -g @bubblewrap/cli

      - name: Generate signing keystore
        run: |
          keytool -genkeypair -v \
            -keystore android.keystore \
            -alias veloura \
            -keyalg RSA -keysize 2048 -validity 10000 \
            -storepass "${{ secrets.APK_KEYSTORE_PASSWORD }}" \
            -keypass "${{ secrets.APK_KEY_PASSWORD }}" \
            -dname "CN=Veloura, OU=Veloura, O=Veloura, L=Cairo, S=Cairo, C=EG"

      - name: Build signed APK
        run: |
          printf "%s\n%s\n" "${{ secrets.APK_KEYSTORE_PASSWORD }}" "${{ secrets.APK_KEY_PASSWORD }}" \
            | bubblewrap build --skipPwaValidation

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: veloura-apk
          path: '*.apk'
VELOURA_EOF

echo "APK build workflow added. Commit and push, then add the two repo secrets before running it."
