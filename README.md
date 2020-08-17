# SideQuest


[Latest Download](https://sidequestvr.com/#/download) | [Discord](https://discord.gg/HNnDPSu) | [Patreon](https://www.patreon.com/TheExpanseVR) | [Paypal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=744A6C394Q8JG&source=url)

![Image](https://i.imgur.com/AlYMbTj.png)



SideQuest is designed to simplify sideloading apps onto your standalone android based headset. It should include everything you need to get started. When you first open the app it is best to open the setup screen and follow the instructions on screen to get set up.

The quest doesnt show 2D apps normally anywhere in the UI. Thankfully though SideQuest has a launcher ( install on the setup screen - scroll down to the bottom ) which appears in the unknown sources list and lets you open 2d apps. You can pick "SideQuest - Home" or "SideQuest - TV" to use the 2D app in the Oculus Home or Oculus TV environments. 

VR apps dont work when launched from the app launcher currently, only 2d apps. The workaround is to launch the VR apps from the unknown sources list instead - they are usually listed there!


## SideQuest Features

-   Automatic download of ADB platform-tools for your platform - win/mac/linux.
-   Automatic download of QuestSaberPatch for your platform - win/mac/linux.
-   Automatic download of songe-converter for your platform - win/mac/linux.
-   Setup instructions for enabling developer mode on your device.
-   AppStarter based app launcher in both Oculus Home and Oculus TV for launching and using 2D apps
-   Drag and drop support for installing arbitrary apk/obb files.
-   File manager with drag and drop support ( thanks Mitch ) 
-   Dark mode
-   New installed apps manager with a backup system.
-   Beat Saber song manager for patching songs onto the Oculus Quest - sorting, multi select, remove duplicates and drag and drop
-   Auto downloading via the in-app browser - now works with beatsaver.com, bsaber.com and also any APK downloads too!


## Setup

[Very Important setup instructions - 5 steps and only takes minutes](https://sidequestvr.com/#/setup-howto)

When you first launch SideQuest it will download the repositories and also download the ADB tools. Once this is done you should go to the Setup menu option and follow through the one time setup to get your device ready to install apps.

If you have any problems you can hit the bug icon on the top right and then open the console tab in that section to capture any errors - these will really help to find and fix bugs.

## Important

Check your antivirus hasn't blocked some parts of the ADB download - this has happened for some with Avast antivirus in particular. 


## ChromeBook Setup

Thanks to [u/przecin/](https://www.reddit.com/user/przecin/) for figuring this out!


```bash 
cd SideQuest-0.7.4 # (or the latest version)
chmod u+x sidequest # (applies permissions)
sudo apt-get install libnss3 # (installs libnss3.so library)
./sidequest # (execute)
```


If you get error: "sidequest: sidequest: cannot execute binary file" this means you didn't apply permissions


If you get error ./sidequest: error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory" this means you need to install libnss3.so


## App Developers: 
We now have a really easy and powerful app manager portal to be able to manage your app listings on SideQuest. 

[Submit Apps To SideQuest](https://github.com/the-expanse/SideQuest/wiki/How-To-Submit-Games)

## Build Steps

Clone the repo. 

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

## Contribution Guidelines

We are pretty relaxed at this point, in that we will accept arbitrary PRs, but all collaborators must agree on a way forward. We live by the [Contributor Covenant](https://www.contributor-covenant.org/)

