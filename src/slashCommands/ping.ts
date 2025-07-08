import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";

// 🔸 Parses a string like "key=value" into [key, value]
function parseParam(input?: string): [string, string] | null {
  if (!input || !input.includes("=")) return null;
  const [key, ...valueParts] = input.split("=");
  return [key.trim(), valueParts.join("=").trim()];
}

const testCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Send data to a webhook by building query parameters")
    .addStringOption(option =>
      option.setName("url").setDescription("Base webhook URL").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("param1").setDescription("First key=value query parameter")
    )
    .addStringOption(option =>
      option.setName("param2").setDescription("Second key=value query parameter")
    )
    .addStringOption(option =>
      option.setName("param3").setDescription("Third key=value query parameter")
    ),

  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    // 🔸 Extract raw option data from interaction.options.data
    const data = interaction.options.data;
    const baseUrl = data.find(opt => opt.name === "url")?.value as string;

    const paramRawList = [
      data.find(opt => opt.name === "param1")?.value,
      data.find(opt => opt.name === "param2")?.value,
      data.find(opt => opt.name === "param3")?.value
    ] as (string | undefined)[];

    // 🔸 Convert param inputs to object form
    const queryParams: Record<string, string> = {};
    for (const raw of paramRawList) {
      const parsed = parseParam(raw);
      if (parsed) {
        const [key, value] = parsed;
        queryParams[encodeURIComponent(key)] = encodeURIComponent(value);
      }
    }

    // 🔸 Construct final URL
    const query = Object.entries(queryParams)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const finalUrl = query ? `${baseUrl}?${query}` : baseUrl;

    console.log("📥 Final URL to fetch:", finalUrl);
    await Promise.resolve(finalUrl); // Optional async hook point

    try {
      const res = await fetch(finalUrl);
      const contentType = res.headers.get("content-type");

      console.log(`🌐 Fetched URL: ${finalUrl}`);
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

      const webhookMessage = await webhookClient.send({
        content: `📡 Webhook triggered.`,
        embeds: [
          new EmbedBuilder()
            .setTitle("Fetched Content")
            .setDescription(`\`\`\`\n${text}\n\`\`\``)
            .setFooter({ text: "Sent via /test command" })
            .setColor(0x00aaff)
        ],
        fetchReply: true
      });

      // 🔸 Obfuscate final URL to avoid Discord triggering it
      const safeUrl = finalUrl
        .replace(/\./g, "[dot]")
        .replace(/\?/g, "[?]")
        .replace(/&/g, "[&]");

      const replyLines = [
        "✅ Webhook successfully sent",
        `📡 Triggered URL:\n\`${safeUrl}\``
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
