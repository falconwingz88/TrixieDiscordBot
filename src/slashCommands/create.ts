import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import dotenv from "dotenv";
import webhookClient from "../index";

dotenv.config();

const production_url = process.env.PRODUCTION_URL;
const baseUrl = production_url;

const trixieCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("trixie")
    .setDescription("Starts a workflow and posts via webhook")
    .addStringOption(option =>
      option
        .setName("command")
        .setDescription("Select a command to run")
        .setRequired(true)
        .addChoices(
          { name: "create", value: "create" },
          { name: "chat", value: "chat" },
          { name: "parse", value: "parse" }
        )
    )
    .addStringOption(option =>
      option
        .setName("data")
        .setDescription("Data payload for the command")
        .setRequired(true)
    ),

  execute: async (interaction) => {
    const command = interaction.options.getString("command", true);
    const data = interaction.options.getString("data", true);

    const query = new URLSearchParams();
    query.append("command", command);
    query.append("data", data);

    const finalUrl = `${baseUrl}?${query.toString()}`;

    console.log("📥 Interaction Received:", {
      user: interaction.user.tag,
      command,
      data,
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
        content: `✅ Webhook successfully sent`,
        embeds: [
          new EmbedBuilder()
            .setTitle(`${command} Workflow Started`)
            .setDescription(`Processing data: ${data}`)
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
      } else {
        console.warn("⚠️ Webhook sent, but no message object was returned.");
      }

      const replyLines = [
        "✅ Webhook successfully sent",
        `📡 Fetched content from: \`${finalUrl}\``
      ];

      if (typeof webhookMessage?.url === "string") {
        replyLines.push(`🔗 [Jump to Webhook Message](${webhookMessage.url})`);
      }

      await interaction.editReply({ content: replyLines.join("\n") });

    } catch (error: any) {
      console.error("❌ Fetch or send error:", error);
      await interaction.editReply({
        content: `❌ Failed to fetch from URL: ${error.message}`
      });
    }
  },

  cooldown: 3
};

export default trixieCommand;
