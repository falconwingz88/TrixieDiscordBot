import {
    Client,
    Events,
    GatewayIntentBits,
    SlashCommandBuilder,
    Partials,
    REST,
    Routes,
    Collection
} from "discord.js";
import type { SlashCommand } from "./types";
import { join } from "path";
import { readdirSync } from "fs";
import dotenv from "dotenv";
dotenv.config();
import testCommand from "./slashCommands/ping";
import helloCommand from "./slashCommands/hello";
import createCommand from "./slashCommands/create";

await const token = process.env.DISCORD_TOKEN; // Token from Railway Env Variable.
await const client_id = process.env.CLIENT_ID;

await const webhook_id = process.env.WEBHOOK_ID;
await const webhook_token = process.env.WEBHOOK_TOKEN;

await export const production_url = process.env.PRODUCTION_URL;
await export const test_url = process.env.TEST_URL;
/*
const originalUrl = production_url_raw;

// Function to add "A" in front of a URL
function addPrefixA(url: string): string {
  return "A" + url;
}

// Assign the result to a new variable
export const production_url = addPrefixA(production_url_raw); // "Ahttps://..."
export const test_url = addPrefixA(test_url_raw);
*/
console.log('DISCORD TOKEN ' + token);
console.log('CLIENT_ID ' + client_id);
console.log('WEBHOOK_ID ' + webhook_id);
console.log('WEBHOOK_TOKEN ' + webhook_token);
console.log('PRODUCTION_URL ' + production_url);
console.log('TEST_URL ' + test_url);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});
client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
});
console.log("jweqioweqeqww");
//webhook
const { EmbedBuilder, WebhookClient } = require('discord.js');

const webhookClient = new WebhookClient({ id: webhook_id, token: webhook_token });
export default webhookClient;
const embed = new EmbedBuilder()
	.setTitle('Ready')
	.setColor(0x00FFFF);

webhookClient.send({
	content: 'Bot Testing Ready',
	//username: 'some-username',
	//avatarURL: 'https://i.imgur.com/AfFp7pu.png',
	embeds: [embed]
});

const slashCommands = new Collection<string, SlashCommand>()

slashCommands.set(helloCommand.command.name, helloCommand)
slashCommands.set(createCommand.command.name, createCommand)
slashCommands.set(testCommand.command.name, testCommand)

const slashCommandsArr: SlashCommandBuilder[] = [helloCommand.command, createCommand.command,testCommand.command]
console.log(slashCommandsArr);
const rest = new REST({ version: "10" }).setToken(token);
rest.put(Routes.applicationCommands(client_id), {
    body: slashCommandsArr.map(command => command.toJSON())
}).then((data: any) => {
    console.log(`🔥 Successfully loaded ${data.length} slash command(s)`)
}).catch(e => {
    console.log(e)
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = slashCommands.get(interaction.commandName);
	console.log(command);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});
client
    .login(token)
    .catch((error) => console.error("Discord.Client.Login.Error", error));
