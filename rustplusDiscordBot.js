const Discord = require("discord.js");          /* Discord module. */
const RustPlus = require("rustplus.js");        /* RustPlus module. */
const fs = require("fs");                       /* Node file system module. */
const Tools = require("./tools/tools.js");

exports.THUMBNAIL_ATTACH = new Discord.MessageAttachment("./images/logo.png", "logo.png");
exports.GITHUB_URL = "https://github.com/alexemanuelol/RustPlus-Discord-Bot";

var config = Tools.readJSON("./config.json");

/* Create an instance of a discord client. */
const discordBot = new Discord.Client();
discordBot.commands = new Discord.Collection();
var notifications = [];

/* Create an instance of RustPlus */
var rustplus = new RustPlus(config.rust.serverIp, config.rust.appPort, config.general.steamId, config.rust.playerToken);

/* Extract all the command files from the commands directory. */
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

/* Extract all the notification files from the notifications directory. */
const notificationFiles = fs.readdirSync("./notifications").filter(file => file.endsWith(".js"));

/* Add a new item to the Collection. Key = command name, Value = the exported module. */
for (const file of commandFiles) {
    const command = require("./commands/" + file);
    discordBot.commands.set(command.name, command);
}

for (const file of notificationFiles) {
    const notification = require("./notifications/" + file);
    notifications.push(notification);
}

function mapMarkerPolling() {
    rustplus.getMapMarkers((msg) => {
        Tools.print("mapMarkerPolling", "Poll");

        if (!Tools.validateResponse(msg, null)) {
            Tools.print("RESPONSE", "getEntityInfo\n" + JSON.stringify(msg));
        }

        config = Tools.readJSON("./config.json");

        if (config.notifications.enabled === "true") {
            let channel = discordBot.channels.cache.get(config.discord.botSpamChannel);
            if (typeof (channel) === "undefined") {
                Tools.print("ERROR", "botSpamChannel is invalid in config.json.");
            }
            else {
                /* Update notifications */
                for (const notification of notifications) {
                    notification.execute(msg, channel, discordBot, rustplus);
                }
            }
        }

        setTimeout(mapMarkerPolling, 10000);
    });
}

function parseCommand(author, message, channel, ingamecall = false) {
    config = Tools.readJSON("./config.json");

    /* If it does not start with the command prefix or if message comes from another bot, ignore. */
    if (!message.startsWith(config.general.prefix)) return;

    /* Obtain additional arguments from the command. */
    const args = message.slice(config.general.prefix.length).trim().split(/ +/);

    /* Obtain the actual command name. */
    const command = args.shift();

    /* If the command does not exist, ignore. */
    if (!discordBot.commands.has(command)) return;

    if (ingamecall) {
        channel.send("**" + author + "** just called command from in-game: **" + message + "**");
    }

    try {
        /* Execute the command. */
        discordBot.commands.get(command).execute(author, message, channel, args, discordBot, rustplus);
    }
    catch (error) {
        Tools.print("ERROR", error, channel);
    }
}

discordBot.on("ready", () => {
    Tools.print("DISCORD", "Logged in as " + discordBot.user.tag + "!");

    /* Set the BOT activity text. */
    discordBot.user.setActivity("commands!", { type: "LISTENING" });
});

/* Called whenever a new message is sent in the guild. */
discordBot.on("message", message => {
    /* If messages comes from another bot, ignore */
    if (message.author.bot) return;

    parseCommand(message.author.username, message.content, message.channel);
});

/* Login to the discord bot. */
discordBot.login(config.discord.token);

/* Wait until connected before sending commands. */
rustplus.on('connected', () => {
    /* RustPlus-Discord-Bot now enabled! */

    /* Go through all devices in devices.json to enable broadcast. */
    Tools.print("DEVICES", "Go through devices.json and validate.");
    let devices = Tools.readJSON("./devices.json");
    for (let device in devices) {
        rustplus.getEntityInfo(parseInt(devices[device].id), (msg) => {
            if (msg.response.hasOwnProperty("error")) {
                Tools.print("DEVICES", device + " : " + parseInt(devices[device].id) + " is INVALID.");
            }
            else {
                Tools.print("DEVICES", device + " : " + parseInt(devices[device].id) + " is VALID.");
            }
        });
    }
});

rustplus.on("message", (msg) => {
    if (msg.hasOwnProperty("broadcast")) {
        config = Tools.readJSON("./config.json");

        if (msg.broadcast.hasOwnProperty("teamMessage")) {
            Tools.print("BROADCAST", "teamMessage received.");

            let message = msg.broadcast.teamMessage.message.message;
            let author = msg.broadcast.teamMessage.message.name;
            let channel = discordBot.channels.cache.get(config.discord.botSpamChannel);

            if (typeof (channel) === "undefined") {
                Tools.print("ERROR", "discordBotSpamChannel is invalid in config.json.");
                return;
            }

            parseCommand(author, message, channel, true);
        }
        else if (msg.broadcast.hasOwnProperty("entityChanged")) {
            Tools.print("BROADCAST", "entityChanged triggered.");

            let devices = Tools.readJSON("./devices.json");
            let channel = discordBot.channels.cache.get(config.discord.botSpamChannel);

            if (typeof (channel) === "undefined") {
                Tools.print("ERROR", "discordBotSpamChannel is invalid in config.json.");
                return;
            }

            for (let device in devices) {
                if (devices[device].id === msg.broadcast.entityChanged.entityId) {
                    if (devices[device].type === 1) { /* Switch */
                        break;
                    }
                    else if (devices[device].type === 2) { /* Alarm */
                        if (msg.broadcast.entityChanged.payload.value === true) {
                            Tools.print("ALARM", devices[device].alarmMessage, channel, rustplus);
                        }
                        break;
                    }
                    else if (devices[device].type === 3) { /* Storage Monitor */
                        break;
                    }

                }
            }
        }
    }
});

/* Connect to the rust server */
rustplus.connect();

/* Start the map marker polling */
setTimeout(mapMarkerPolling, 10000);
