const { register, listen } = require('push-receiver');

const Tools = require("./tools.js");

var fcmClient;

module.exports = {
    fcmReady: false,
    fcmListener: async function (discordBot, rustplus) {
        const rustPlusConfig = Tools.readJSON("./rustplus.config.json");
        const config = Tools.readJSON("./config.json");
        const devices = Tools.readJSON("./devices.json");

        /* Make sure that fcm credentials are in config. */
        if (!rustPlusConfig.fcm_credentials) {
            Tools.print("ERROR", "FCM Credentials missing. Please run: 'npx @liamcottle/rustplus.js fcm-register' " +
                "and then place the output 'rustplus.config.json' file in the root folder of the " +
                "RustPlus-Discord-Bot.");
            discordBot.destroy();
            process.exit(1);
        }

        fcmClient = await listen(rustPlusConfig.fcm_credentials, ({ notification, persistentId }) => {
            /* Create a delay so that buffered notifications are ignored. */
            if (!this.fcmReady) return;

            /* Parse the notification body. */
            const data = notification.data;
            const body = JSON.parse(notification.data.body);

            if (data.channelId === "pairing") {
                if (config.rustplus.pairingNotifications === "true") {
                    if (body.hasOwnProperty("entityType")) {
                        let channel = discordBot.channels.cache.get(config.discord.botSpamChannel);
                        let type = Tools.EntityType[body.entityType];
                        let id = parseInt(body.entityId);

                        for (let device in devices) {
                            if (devices[device].id === id) {
                                /* Already exist in devices.json */
                                Tools.print("ATTENTION", "Device with entityId '" + id + "' already exist in " +
                                    "devices.json");
                                return;
                            }
                        }

                        Tools.print("PAIRING", "A **" + type + "** with the entityId **'" + id + "'** was paired " +
                            "in-game, add to devices?", channel);
                        if (config.rustplus.inGamePairingNotifications === "true") {
                            rustplus.sendTeamMessage("[PAIRING] A " + type + " with entityId '" + id +
                                "' was paired in-game, add to devices?");
                        }
                    }
                }
            }
            else if (data.channelId === "alarm") {

            }

        });
    },
};