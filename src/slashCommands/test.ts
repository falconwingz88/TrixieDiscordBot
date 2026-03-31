import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";

const testCommand: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("test")
        .setDescription("Test webhook and tag if failed"),

    execute: async (interaction) => {

        await interaction.reply({
            content: "📤 Sending request to webhook...",
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 5000); // 5 seconds timeout

        try {
            const res = await fetch(
                //"https://primary-production-cc89.up.railway.app/webhook/b4d32f34-2646-4510-aa59-16ee84367943",
                "https://n8n-neotrix-production.tailfd96cd.ts.net/form-test/2ffed012-e80f-4100-8045-738a2e17482a",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: "test"
                    }),
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);

            if (!res.ok) {
                throw new Error(`Bad status: ${res.status}`);
            }

            await interaction.followUp({
                content: "✅ Webhook responded successfully."
            });

        } catch (error) {

            await interaction.followUp({
                content: `⚠️ <@${interaction.user.id}> webhook failed or did not respond.`
            });
        }
    },

    cooldown: 3
};

export default testCommand;