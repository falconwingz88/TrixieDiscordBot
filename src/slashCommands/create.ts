import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";
/*
// Function to remove "A" from the beginning
function removePrefixA(url: string): string {
  if (url.startsWith("A")) {
    return url.slice(1); // Remove first character
  }
  return url;
}

// Test removing the prefix
const restoredUrl = removePrefixA(production_url); // back to original

console.log("✅ Restored URL: ", restoredUrl);
*/
//const importUrl = import production_url from "../index";
//console.log("✅ importUrl : ", importUrl);

const baseUrl = "https://primary-production-581a.up.railway.app/webhook/webhook";
//still using hardcoded code
const createCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Starts a workflow and posts via webhook")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Title for the workflow")
        .setRequired(true)
    ),

  execute: async (interaction) => {
    let title = "";

    for (const opt of interaction.options.data) {
      if (opt.name === "title" && opt.value) {
        title = String(opt.value);
      }
    }
    const importUrl = import production_url from "../index";
    // ✅ Log production_url
    if (typeof production_url === "string") {
      console.log("🔧 production_url:", production_url);
    } else {
      console.log("🔧 production_url (stringified):", JSON.stringify(production_url, null, 2));
    }

    const query = new URLSearchParams();
    if (title) query.append("title", title);

    const finalUrl = `${importUrl}?${query}`;

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
        content: `✅ Webhook successfully sent`,
        embeds: [
          new EmbedBuilder()
            .setTitle(`${title} Workflow Started`)
            .setDescription(`Creating.....`)
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

export default createCommand;
