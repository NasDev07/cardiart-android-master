#!/bin/bash

rm -r platforms/android/app/src/main/assets/python/
rm -r platforms/android/app/src/main/jniLibs/
ionic cordova plugin rm cordova-plugin-pybridge

#ionic cordova plugin add git+ssh://git@192.168.21.185:rd2/cordova-plugin-pybridge.git
# ionic cordova plugin add git+ssh://git@192.168.21.185:rd2/cordova-plugin-pybridge.git#af59a7048f10ebb120fa13565bbb6e4d146ccec2
#ionic cordova plugin add /home/terry/Imediplus/Sourcecode/cordova-plugin-pybridge
ionic cordova plugin add git+https://gitlab.com/imediplus-android/cordova-plugin-pybridge.git#af59a7048f10ebb120fa13565bbb6e4d146ccec2
