#!/bin/bash

if [ $# -eq 1 ]; then
    RELEASE_VERSION=$1
    APK_PATH="./platforms/android/app/build/outputs/apk/release"

    # clean
    ionic cordova platform remove android
    rm -rf node_modules
    rm -rf plugins
    rm -rf www
    ionic cordova platform add android

    # build
    ionic cordova build android --prod --release
    jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore certificate/phonomagics1.jks -storepass i28113595 -keypass i28113595 ${APK_PATH}/app-release-unsigned.apk phonomagics
    ~/Tools/Android/Sdk/build-tools/27.0.2/zipalign -v 4 ${APK_PATH}/app-release-unsigned.apk ${APK_PATH}/app-release-${RELEASE_VERSION}.apk
    md5sum ${APK_PATH}/app-release-${RELEASE_VERSION}.apk > ${APK_PATH}/app-release-${RELEASE_VERSION}.apk_md5sum
    ls -l ${APK_PATH}

    # install
    adb install -r ${APK_PATH}/app-release-${RELEASE_VERSION}.apk
else
    echo "ex: ./release.sh v1.0.0";
    exit
fi