import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import { SlashCommand } from "../types";

const helloCommand: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("hello")
        .setDescription("Hello from trixie :)")
        .addStringOption(option => {
            return option
                .setName("content")
                .setDescription("this is a parameter for a command")
                .setRequired(false);
        }),
    execute: async (interaction) => {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: "Response Title" })
                    .setDescription(`👋 Hi! this is helpful bot`)
//
            ]
        })
    },
    cooldown: 3
}

export default helloCommand;