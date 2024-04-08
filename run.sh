#!/bin/bash

case $1 in
    -p)
        ionic cordova build android --prod --release
        ;;
    -l)
        ionic cordova run android -l -c
        ;;
    -lt)
        ionic cordova run android -l -c --target Nexus_S_API_22
        ;;
    -t)
        ionic cordova run android --target Nexus_S_API_22
        ;;
    *)              
        ionic cordova run android
        ;;
esac
