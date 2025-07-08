import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";

// Optional: helper to parse key=value from options in future
function buildQueryURL(baseUrl: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

const testCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Fetches content from a URL and posts it via webhook")
    .addStringOption(option =>
      option.setName("url").setDescription("The base URL to fetch").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("key1").setDescription("First key=value pair")
    )
    .addStringOption(option =>
      option.setName("key2").setDescription("Second key=value pair")
    )
    .addStringOption(option =>
      option.setName("key3").setDescription("Third key=value pair")
    ),

  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // Extract inputs
    const baseUrl = interaction.options.getString("url", true);
    const rawParams = [
      interaction.options.getString("key1"),
      interaction.options.getString("key2"),
      interaction.options.getString("key3"),
    ];

    // Build query params
    const queryParams: Record<string, string> = {};
    for (const raw of rawParams) {
      if (!raw || !raw.includes("=")) continue;
      const [key, ...valueParts] = raw.split("=");
      const value = valueParts.join("=");
      if (key && value) queryParams[key.trim()] = value.trim();
    }

    const finalUrl = buildQueryURL(baseUrl, queryParams);

    console.log("📥 Final URL to fetch:", finalUrl);

    try {
      const res = await fetch(finalUrl);
      const contentType = res.headers.get("content-type");

      console.log(`🌐 Fetched URL: ${finalUrl}`);
      console.log(`↩️ Status: ${res.status} ${res.statusText}`);
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

      if (text.length > 1900) {
        text = text.slice(0, 1900) + "\n...[truncated]";
      }

      const webhookMessage = await webhookClient.send({
        content: `📡 Webhook triggered with URL (obfuscated):`,
        embeds: [
          new EmbedBuilder()
            .setTitle("Fetched Content")
            .setDescription(`\`\`\`\n${text}\n\`\`\``)
            .setFooter({ text: "Triggered via /test command" })
            .setColor(0x00aaff)
        ],
        fetchReply: true
      });

      if (webhookMessage?.id) {
        console.log("📤 Webhook message sent:", {
          id: webhookMessage.id,
          url: webhookMessage.url,
          channelId: webhookMessage.channel?.id
        });
      }

      // Obfuscate URL to avoid Discord preview-trigger
      const safeUrl = finalUrl.replace(/\./g, "[dot]").replace(/\?/g, "[?]").replace(/&/g, "[&]");

      const replyLines = [
        "✅ Webhook successfully sent",
        `📡 Triggered URL:\n\`${safeUrl}\``
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
