# SideQuest
Below is the documentation of SideQuest with instructions for building and signing then application.

### Build Steps

Clone the repo

To install the app dependencies 
```
yarn install
```

To start the dev stack run 
```
yarn start
```

To build the angular app only
```
yarn app-build
```


To build the electron app only
```
yarn build
yarn build --mac
yarn build --wlm
```

To build the app & angular app (NOT for Raspberry Pi)
```
yarn dist
```

To build the app & angular app on a Raspberry Pi
```
yarn dist --armv7l
```

To re-launch electron if you accidentally close it
```
yarn electron
```

To reset things
```
yarn reset
```

## Windows Silent Install

```
"/S" for silent install and "/D=<path>"
```



## Code Siging

The app is built and signed/notorized with electron-builder/electron-notorize.
Below are the required environment variables and their explanations.

APPLE_ID - your apple id eg.  someone@apple.com

APPLE_ID_PASS - A app specific password - https://support.apple.com/en-gb/HT204397

APPLE_ID_TEAM - The app le Team ID found on the apple developer dashboard

CSC_LINK - The base64 encoded .p12 file ( Apple Developer ID cert ) as a string. Do not include the `-----BEGIN CERTIFICATE-----` or `-----END CERTIFICATE-----` parts just the base64 string.

CSC_KEY_PASSWORD - The passphrase used when generating the .p12 file for mac.

GH_TOKEN - The github personal access token used to upload releases

WIN_CSC_LINK - The base64 encoded .p12 file ( Windows Code Signing Cert ). as a string. Do not include the `-----BEGIN CERTIFICATE-----` or `-----END CERTIFICATE-----` parts just the base64 string.

WIN_CSC_KEY_PASSWORD - The passphrase used when generating the .p12 file for windows.
