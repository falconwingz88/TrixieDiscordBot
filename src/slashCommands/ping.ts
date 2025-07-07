import { SlashCommandBuilder, ChannelType, TextChannel, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";

const testCommand: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("test")
        .setDescription("Test command")
        .addStringOption(option =>
            option
                .setName("content")
                .setDescription("this is a parameter for a command")
                .setRequired(false)
        ),
    execute: async (interaction) => {
        const options: { [key: string]: string | number | boolean } = {};
        for (let i = 0; i < interaction.options.data.length; i++) {
            const element = interaction.options.data[i];
            if (element.name && element.value) options[element.name] = element.value;
        }

        console.log('interaction:', interaction);

        const message = await interaction.reply({
            fetchReply: true,
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: "Response Title" })
                    .setDescription(`👋 Hi! 
                    Your ping: ${interaction.client.ws.ping}
                    Your input: ${options.content}`)
            ]
        });
        console.log("Message :", message);
        console.log("Message ID:", message.id);
        console.log("Message content:", message.content);
        console.log("Message channel:", message.channel.id);
        console.log("Message URL:", message.url);
    },
    cooldown: 3
};

export default testCommand;
