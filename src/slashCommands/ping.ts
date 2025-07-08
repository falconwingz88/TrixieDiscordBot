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
        .setDescription("The base URL to fetch")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("value1")
        .setDescription("Value for query param 'value1'")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("value2")
        .setDescription("Value for query param 'value2'")
        .setRequired(false)
    ),

  execute: async (interaction) => {
    // Extract options manually from interaction.options.data
    let baseUrl = "";
    let value1 = "";
    let value2 = "";

    for (const opt of interaction.options.data) {
      if (opt.name === "url" && opt.value) {
        baseUrl = String(opt.value);
      }
      if (opt.name === "value1" && opt.value) {
        value1 = String(opt.value);
      }
      if (opt.name === "value2" && opt.value) {
        value2 = String(opt.value);
      }
    }

    // Build final URL with query params
    const query = new URLSearchParams();
    if (value1) query.append("value1", value1);
    if (value2) query.append("value2", value2);

    const finalUrl = query.toString() ? `${baseUrl}?${query}` : baseUrl;

    console.log("📥 Interaction Received:", {
      user: interaction.user.tag,
      command: interaction.commandName,
      finalUrl
    });

    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(finalUrl);
      const contentType = res.headers.get("content-type");

      console.log(`🌐 Fetched URL: ${finalUrl}`);
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
        content: `📡 Fetched content from: ${finalUrl}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("Fetched Content")
            .setDescription(`\`\`\`\n${text}\n\`\`\``)
            .setColor(0x00aaff)
        ],
        fetchReply: true
      });

      // Log webhook response
      if (webhookMessage?.id) {
        console.log("📤 Webhook message sent:", {
          id: webhookMessage.id,
          url: webhookMessage.url,
          channelId: webhookMessage.channel?.id
        });
      } else {
        console.warn("⚠️ Webhook sent, but no message object was returned.");
      }

      // ✅ Final reply with visible full URL
      const replyLines = [
        "✅ Webhook successfully sent",
        `📡 Fetched content from: \${finalUrl}\`
      ];

      if (webhookMessage?.url) {
        replyLines.push(`🔗 [Jump to Webhook Message](${webhookMessage.url})`);
      }

      await interaction.editReply({ content: replyLines.join("\n") });

    } catch (error: any) {
      console.error("❌ Fetch or send error:", error);
      await interaction.editReply({
        content: ❌ Failed to fetch from URL: ${error.message}
      });
    }
  },

  cooldown: 3
};

export default testCommand;
