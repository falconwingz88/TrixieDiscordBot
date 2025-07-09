import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import fetch from "node-fetch"; // make sure it's installed or use global fetch in Node 18+

const sendWebhookCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("sendwebhook")
    .setDescription("Bot sends a request to a webhook and confirms it."),

  execute: async (interaction) => {
    const url = "https://primary-production-581a.up.railway.app/webhook/webhook?value1=123";

    await interaction.deferReply();

    try {
      const res = await fetch(url);
      console.log(`✅ Webhook sent. Status: ${res.status}`);

      await interaction.editReply({
        content: `✅ Sent request to: ${url}`
      });

      // Bot says something in the channel too (public message)
      const channel = interaction.channel;
      if (channel?.isTextBased()) {
        channel.send("📡 The workflow was triggered!");
      }

    } catch (error: any) {
      console.error("❌ Error sending webhook:", error);
      await interaction.editReply({
        content: `❌ Failed to send webhook: ${error.message}`
      });
    }
  },

  cooldown: 3
};

export default sendWebhookCommand;
