import type { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js"

export interface SlashCommand {
    command: SlashCommandBuilder | any,
    execute: (interaction: ChatInputCommandInteraction) => void,
    autocomplete?: (interaction: AutocompleteInteraction) => void,
    cooldown?: number // in seconds
}
