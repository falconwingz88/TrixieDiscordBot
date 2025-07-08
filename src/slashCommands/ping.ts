import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";

// 🔸 Parse "key=value" input into [key, value]
function parseParam(input?: string): [string, string] | null {
  if (!input || !input.includes("=")) return null;
  const [key, ...rest] = input.split("=");
  return [key.trim(), rest.join("=").trim()];
}

const testCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Send data to a webhook by building query parameters")
    .addStringOption(option =>
      option.setName("url").setDescription("Base webhook URL").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("param1").setDescription("First query parameter")
    )
    .addStringOption(option =>
      option.setName("param2").setDescription("Second query parameter")
    )
    .addStringOption(option =>
      option.setName("param3").setDescription("Third query parameter")
    ),

  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // 🔸 Extract inputs
    const baseUrl = interaction.options.data.find(opt => opt.name === "url")?.value as string;
    const rawParams = ["param1", "param2", "param3"].map(name =>
      interaction.options.data.find(opt => opt.name === name)?.value as string | undefined
    );

    // 🔸 Build query string
    const queryParams: string[] = [];
    for (const raw of rawParams) {
      const parsed = parseParam(raw);
      if (parsed) {
        const [key, value] = parsed;
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }

    // 🔸 Final URL with query string
    let fullUrl = baseUrl;
    if (queryParams.length > 0) {
      fullUrl += "?" + queryParams.join("&");
    }

    // 🔸 Log and await final URL
    console.log("📥 Final URL to be fetched:", fullUrl);
    await Promise.resolve(fullUrl); // Hook point for later if needed

    try {
      const res = await fetch(fullUrl);
      const contentType = res.headers.get("content-type");

      console.log(`🌐 Fetched URL: ${fullUrl}`);
      console.log(`↩️ Status: ${res.status} ${res.statusText}`);
      console.log(`📄 Content-Type: ${contentType}`);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

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

      // 🔸 Send to webhook
      const webhookMessage = await webhookClient.send({
        content: `📡 Webhook triggered with URL: ${fullUrl}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("Fetched Content")
            .setDescription(`\`\`\`\n${text}\n\`\`\``)
            .setColor(0x00aaff)
        ],
        fetchReply: true
      });

      // 🔸 Obfuscate final URL to avoid re-trigger
      const safeDisplayedUrl = fullUrl.replace(/\./g, "[dot]");

      const replyLines = [
        "✅ Webhook successfully sent",
        `📡 Triggered URL:\n${safeDisplayedUrl}`
      ];

      if (webhookMessage?.url) {
        replyLines.push(`🔗 [Jump to Webhook Message](${webhookMessage.url})`);
      }

      await interaction.editReply({ content: replyLines.join("\n") });

    } catch (error: any) {
      console.error("❌ Fetch or send error:", error);
      await interaction.editReply({
        content: `❌ Failed to send webhook: ${error.message}`
      });
    }
  },

  cooldown: 3
};

export default testCommand;
