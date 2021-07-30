const fs = require("fs");
const Tools = require("../tools/tools.js");

module.exports = {
    name: "turnOn",
    description: "Turn on a Smart Switch.",
    execute(message, args, discordBot, rustplus) {
        if (args.length === 0) {
            console.log("ERROR: At least 1 argument is required. Example: !turnOn @name/id");
            Tools.sendEmbed(message.channel, "ERROR", "At least 1 argument is required. Example: !turnOn @name/id.");
            return false;
        }

        /* Read the devices.json file. */
        fs.readFile("./devices.json", (err, data) => {
            if (err) throw err;
            let devices = JSON.parse(data);
            let dev;

            for (let arg of args) {
                if (devices.hasOwnProperty(arg)) {
                    dev = parseInt(devices[arg]);
                }
                else {
                    dev = parseInt(arg);
                }

                rustplus.turnSmartSwitchOn(dev, (msg) => {
                    console.log("Response message: >> turnSmartSwitchOn <<\n" + JSON.stringify(msg));

                    if (msg.response.hasOwnProperty("error")) {
                        console.log("Some error occured, check response message above.");
                        Tools.sendEmbed(message.channel, "ERROR", "'**" + dev + "**' invalid entity ID.");
                    }
                    else {
                        Tools.sendEmbed(message.channel, "Successfully Turned On", "'**" + arg + "**' was turned on.");
                    }
                });
            }
        });

        return true;
    },
};
