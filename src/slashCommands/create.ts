import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";
import test_url from "../index"; // ✅ kept

const createCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Starts a workflow using the provided value1 parameter")
    .addStringOption(option =>
      option
        .setName("value1")
        .setDescription("Value for query param 'value1'")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("value2")
        .setDescription("Value for query param 'value2'")
        .setRequired(false)
    ),

  execute: async (interaction) => {
    const baseUrl = test_url;

    let value1 = "";
    let value2 = "";

    for (const opt of interaction.options.data) {
      if (opt.name === "value1" && opt.value) value1 = String(opt.value);
      if (opt.name === "value2" && opt.value) value2 = String(opt.value);
    }

    const query = new URLSearchParams();
    if (value1) query.append("value1", value1);
    if (value2) query.append("value2", value2);

    const finalUrl = query.toString() ? `${baseUrl}?${query}` : baseUrl;

    console.log("📥 Final URL to be sent:", finalUrl);

    await interaction.deferReply({ ephemeral: true });

    // 🔸 Skip fetch, just send the webhook
    const webhookMessage = await webhookClient.send({
      content: `📡 Workflow started from URL: ${finalUrl}`,
      fetchReply: true
    });

    if (webhookMessage?.id) {
      console.log("📤 Webhook message sent:", {
        id: webhookMessage.id,
        url: webhookMessage.url,
        channelId: webhookMessage.channel?.id
      });
    }

    // 🔸 Final bot reply
    await interaction.editReply({
      content: `✅ "${value1}" Workflow started`
    });
  },

  cooldown: 3
};

export default createCommand;
