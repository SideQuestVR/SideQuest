const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== 'darwin') {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    if (process.env.APPLE_ID && process.env.APPLE_ID_PASS) {
        return await notarize({
            appBundleId: 'com.sidequestvr.app',
            appPath: `${appOutDir}/${appName}.app`,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASS,
            teamId: process.env.APPLE_ID_TEAM,
            ascProvider: process.env.APPLE_ID_TEAM
        });
    } else {
        console.warn('NOTICE: Did not notarize application due to missing environment variables.');
    }
};
