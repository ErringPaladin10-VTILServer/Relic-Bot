////////////////////////////////////////////////////////////////////////
////////////------------------------------------------------////////////
////////////                   Relic V1                     ////////////
////////////          ErringPaladin10@VTILServer.com        ////////////
////////////------------------------------------------------////////////
////////////////////////////////////////////////////////////////////////

const startTime = Date.now();

/// DotEnv support.
require('dotenv').config({ path: `./.env` });

/// Librarys
const { Client, User, Guild, BaseGuild, Message } = require('discord.js');
const { GatewayIntentBits } = require('discord.js');
const { executionAsyncId } = require('async_hooks');
const util = require('util');
const fs = require('fs');
const path = require('path');
const http = require("http");
const express = require("express");
const websockets = require("ws");
const urlParser = require("url");
const { randomUUID } = require('crypto');

const SettingsUri = ".\\Settings\\RelicSettings.json"

/// Main
const Relic = {
    /// Loaded
    "HasLoaded": false,

    /// Roles
    "Roles": {

        /// Root, Rank {3}
        "Root": {
            "Rank": 3,
            "Permissions": [
                { "type": "other", "value": "OWNER" },
                { "type": "other", "value": "CREATOR" }
            ],
        },

        /// Administrator, Rank {2}
        "Administrator": {
            "Rank": 2,
            "Permissions": [
                { "type": "permission", "value": "ADMINISTRATOR" }
            ],
        },

        /// Moderator, Rank {1}
        "Moderator": {
            "Rank": 1,
            "Permissions": [
                { "type": "permission", "value": "KICK_MEMBERS" },
                { "type": "permission", "value": "BAN_MEMBERS" }
            ]
        },

        /// Default, Rank {0}
        "User": {
            "Rank": 0,
            "Permissions": [
                { "type": "permission", "value": "SEND_MESSAGES" }
            ]
        }
    },

    /// Settings
    "BotSettings": JSON.parse(fs.readFileSync(SettingsUri, "utf-8")).BotSettings,
    "GlobalSettings": JSON.parse(fs.readFileSync(SettingsUri, "utf-8")).GlobalSettings,
    "ConsoleSettings": JSON.parse(fs.readFileSync(SettingsUri, "utf-8")).ConsoleSettings,

    /// Commands
    "Commands": {},
}

function createCommand(name, rank, list, description, bot, callback) {
    Relic.Commands[name] = {
        "rank": rank,               // Rank of command.
        "list": list,               // How is the command used?
        "description": description, // Description of the command.
        "bot": bot,                 // Is this command ONLY used in discord?
        "callback": callback        // the actual code for the command.
    }
};


function sendMessage(channel, message, member, type, colour) {
    channel.send({
        content: `<\x40${member.id}>, `,
        embeds: [
            {
                title: type,
                description: message,
                color: colour || 0x00FF00,
                footer: {}
            }
        ]
    });
}

function writeErrorMessage(message, channel, member) {
    return sendMessage(channel, message, member, "Error", 0xFF0000)
};

const timeConversion = function (seconds) {
    seconds = Math.floor(seconds);
    let time = "";
    let days = Math.floor(seconds / 86400);
    if (days > 0)
        if (days < 10) {
            time += "0" + days + ":";
        } else
            time += days + ":";
    let hour = Math.floor(seconds / 3600 % 24);
    if (hour < 10) {
        time += "0" + hour + ":";
    } else
        time += hour + ":";
    let minute = Math.floor(seconds / 60) % 60;
    if (minute < 10) {
        time += "0" + minute + ":";
    } else
        time += minute + ":";
    seconds = seconds % 60;
    if (seconds < 10) {
        time += "0" + seconds;
    } else
        time += seconds;
    return time;
}


const Log = function (system, message, msgType) {
    switch (msgType) {
        case "ERROR": {
            console.log(`[${timeConversion((Date.now() - startTime) / 1000)}][ERROR][${system}]: ${message}`);
            break;
        }
        case "WARNING": {
            console.log(`[${timeConversion((Date.now() - startTime) / 1000)}][WARN][${system}]: ${message}`);
            break;
        }
        case "INFO": {
            console.log(`[${timeConversion((Date.now() - startTime) / 1000)}][INFO][${system}]: ${message}`);
            break;
        }
        default: {
            console.log(`[${timeConversion((Date.now() - startTime) / 1000)}][MESSAGE][${system}]: ${message}`);
        }
    };
    if (msgType == "ERROR" || msgType == "WARNING") {
        let trace = new Error().stack;
        Log(system, "[TRACE] " + message + "\n" + trace, "MESSAGE");
    }
}

///////////////////TEMPLATE/////////////////////
/* ------------------------------------------
    Log(process.env.NAME, ``, "INFO")
--------------------------------------------- */
///////////////////TEMPLATE/////////////////////


function evalCmd(message, user, code) {
    var channel = message;
    try {
        let evaled = eval(code);
        if (typeof evaled !== "string")
            evaled = util.inspect(evaled);
        channel.send({ content: 'Code Evaluated!' });
    } catch (err) {
        writeErrorMessage(`\`EVAL\` \`\`\`xl\n${err}\n\`\`\``, channel, user);
    }
}

function getRole(user, guild) {
    for (var name in Relic.Roles) {
        let role = Relic.Roles[name];
        for (var i in role.Permissions) {
            let permission = role.Permissions[i];
            let pass = false;

            if (permission.type == "other") {
                if (permission.value == "CREATOR") {
                    pass = user.id == "";
                } else if (permission.value == "OWNER") {
                    pass = user.id == guild.ownerId;
                }
            } else {
                pass = user.permissions.has(permission.value);
            };

            if (pass)
                return ({
                    "name": name,
                    "rank": role.Rank
                });
        };
    };

    return ({
        "name": "User",
        "rank": 0
    });
};

/// Commands

/**
 * @param  { Message }  array
 * @param  { User }     result
 * @param  { Channel }  Channel 
 * @description "The <Ping> Command for Relic"
**/
createCommand("Ping", 0, ["ping"], "Pings you", true, function (message, speaker, channel) {
    channel.send({
        content: `<\x40${speaker.id}>, ` + (message.length == 0 ? "Pong" : message)
    });
});

/**
 * @param  { Message }  array
 * @param  { User }     result
 * @param  { Channel }  Channel 
 * @description "The <Rank> Command for Relic"
**/
createCommand("Rank", 0, ["viewrank", "vrank", "viewr"], `Views your rank on ${process.env.NAME}`, true, async function (message, speaker, channel, guild) {
    let id = message.match(/(\d+)/)[1];
    let member = await guild.members.fetch(id);

    if (id != null) {

        var role = getRole(speaker, {
            ownerId: member.id
        });

        channel.send({
            content: `<\x40${speaker.id}>, <\x40${member.id}>'s Rank is (${role.rank}, ${role.name})`
        });
    } else throw (`${process.env.NAME}: no member specified!`);
});

/**
 * @param  { Message }  array
 * @param  { User }     result
 * @param  { Channel }  Channel 
 * @description "The <Execute> Command for Relic"
**/
createCommand("Execute", 3, ["eval", "exe", "execute"], "Evaluates <Code> on the hosts machine", true, function (message, speaker, channel) {
    evalCmd(channel, speaker, message);
});


/// Bot intital setup
Log(process.env.NAME, `[${process.env.NAME}]: ${process.env.NAME} is in setup`, "INFO")

/// Client for Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping
    ],
});

/// Log it
Log(process.env.NAME, `[${process.env.NAME}]: Finished Setup`, "INFO")

/// Bots needs to read messages
client.on("messageCreate", message => {
    var guild = message.guild;
    var author = message.author;
    var member = message.member;
    var channel = message.channel;

    if (!message.content.startsWith(Relic.BotSettings.Prefix) || author.bot)
        return;

    var content = message.content.substring(Relic.BotSettings.Prefix.length);
    var match = content.match(/(\S+)\s*(.*)/);
    var role = getRole(member, guild);

    for (var name in Relic.Commands) {
        let command = Relic.Commands[name];

        for (var i in command.list) {
            let identifier = command.list[i];

            if (match[1].toLowerCase() == identifier.toLowerCase()) {
                if (role.rank < command.rank) {
                    if (Relic.BotSettings.CommandErrors.NotifyRankExceeds)
                        writeErrorMessage("You do not have the required rank for this command!", channel, member);

                    return;
                };

                try {
                    let rtn = command.callback(match[2], member, channel, guild, message);
                    if (rtn instanceof Promise) {
                        rtn.catch(error => {
                            let errorString = error.toString();
                            if (errorString.startsWith(`[${process.env.NAME}]: `)) {
                                if (Relic.BotSettings.CommandErrors.NotifyParsedError)
                                    /// Still give the output some kindof warning that it errored

                                    Log(process.env.NAME, errorString, "WARNING")
                                writeErrorMessage(errorString, channel, member);
                            } else if (Relic.BotSettings.CommandErrors.NotifyGeneralError)
                                writeErrorMessage(errorString, channel, member);
                        });
                    };
                } catch (error) {
                    let errorString = error.toString();
                    if (errorString.startsWith(`[${process.env.NAME}]: `)) {
                        /// Still give the output some kindof warning that it errored

                        Log(process.env.NAME, errorString, "WARNING")

                        if (Relic.BotSettings.CommandErrors.NotifyParsedError)
                            writeErrorMessage(errorString, channel, member);
                    } else if (Relic.BotSettings.CommandErrors.NotifyGeneralError)
                        writeErrorMessage(errorString, channel, member);
                };
            };
        };
    };
});

//* These Error functions are taken from Roblox's SiteTest4 Credits to Petko :) *//

/// Error reporting and Handling
function exitHandler(options) {
    if (options.exit) {
        if (options.error) {
            return reportDebatableError(options.ex);
        }
        if (options.message) {
            Log(process.env.NAME, options.message, "WARNING")
        }
        process.exit();
    }
}

///
function reportDebatableError(Exception) {
    return Log(process.env.NAME, options.message, "ERROR")
}

/// The almighty process hell
process.on('SIGINT', exitHandler.bind(null, { exit: true, message: 'SIGINT on server' }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true, message: 'SIGUSR1 on server' }));
process.on('beforeExit', exitHandler.bind(null, { exit: true, message: 'Exit Services' }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true, message: 'SIGUSR2 on server' }));

/// Everything is ready, Now login
Log(process.env.NAME, `[${process.env.NAME}]: ${process.env.NAME} is on logon stage`, "INFO")

/// Attempt to login
client.login(process.env.TOKEN);
Log(process.env.NAME, `[${process.env.NAME}]: Logged in, ${process.env.NAME} has finished loading!`, "INFO")
Relic.HasLoaded = true
/// We are in and online
Log(process.env.NAME, `[${process.env.NAME}]: logon session completed.`, "INFO")
