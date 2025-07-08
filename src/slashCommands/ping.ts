import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";

const testCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Fetches content from a URL and posts it via webhook")
    .addStringOption(option =>
      option
        .setName("url")
        .setDescription("The URL to fetch")
        .setRequired(true)
    ),

  execute: async (interaction) => {
    // Extract URL manually
    let url = "";
    for (const opt of interaction.options.data) {
      if (opt.name === "url" && opt.value) {
        url = String(opt.value);
      }
    }

    console.log("📥 Interaction Received:", {
      user: interaction.user.tag,
      command: interaction.commandName,
      url
    });

    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(url);
      const contentType = res.headers.get("content-type");

      console.log(`🌐 Fetched URL: ${url}`);
      console.log(`↩️ Response status: ${res.status} ${res.statusText}`);
      console.log(`📄 Content-Type: ${contentType}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      let text: string;
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        text = JSON.stringify(json, null, 2);
      } else {
        text = await res.text();
      }

      console.log("📝 Raw fetched content:", text.length > 500 ? text.slice(0, 500) + "...[truncated]" : text);

      if (text.length > 1900) {
        text = text.slice(0, 1900) + "\n...[truncated]";
      }

      const webhookMessage = await webhookClient.send({
        content: `📡 Fetched content from: ${url}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("Fetched Content")
            .setDescription(`\`\`\`\n${text}\n\`\`\``)
            .setColor(0x00aaff)
        ],
        fetchReply: true // Only safe with Discord webhooks
      });

      // Log webhook response
      if (webhookMessage?.id) {
        console.log("📤 Webhook message sent:");
        console.log({
          id: webhookMessage.id,
          url: webhookMessage.url,
          channelId: webhookMessage.channel?.id
        });
      } else {
        console.warn("⚠️ Webhook sent, but no message object was returned.");
      }

      // ✅ Final reply (safe: no raw webhook URL, only Discord message URL)
      const replyLines = [
        "✅ Webhook successfully sent",
        `📡 Fetched content from: \`${url}\`` // 👈 display as inline code to avoid previews
      ];

      if (webhookMessage?.url) {
        replyLines.push(`🔗 [Jump to Webhook Message](${webhookMessage.url})`);
      }

      await interaction.editReply({
        content: replyLines.join("\n")
      });

    } catch (error: any) {
      console.error("❌ Fetch or send error:", error);
      await interaction.editReply({
        content: `❌ Failed to fetch from URL: ${error.message}`
      });
    }
  },

  cooldown: 3
};

export default testCommand;
