import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { SlashCommand } from "../types";

const REVISION_STATUS_UPDATE_URL =
  "https://primary-production-cc89.up.railway.app/webhook/neotrix-update-production-status-stage"; // same as revision

const updateProjectStatusCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("update_project_status")
    .setDescription("Update Project Production Stage to In Progress")
    .addStringOption(option =>
      option
        .setName("stage")
        .setDescription("Select production stage")
        .setRequired(true)
        .addChoices(
          { name: "3D", value: "3D" },
          { name: "Rendering", value: "Rendering" },
          { name: "Animation", value: "Animation" },
          { name: "Modelling", value: "Modelling" },
          { name: "Layout", value: "Layout" },
          { name: "Lighting", value: "Lighting" },
          { name: "Compositing", value: "Compositing" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false });

    const selected_stage = interaction.options.getString("stage", true);
    const status = "In Progress";          // always fixed
    const revision_note = "";              // always empty

    const channel = interaction.channel;
    const isThread = channel?.isThread() ?? false;

    let category = { id: null as string | null, name: null as string | null };

    if (interaction.inGuild()) {
      if (isThread) {
        const parentCategory = channel?.parent?.parent;
        if (parentCategory) {
          category = { id: parentCategory.id, name: parentCategory.name };
        }
      } else {
        const parentCategory = channel?.parent;
        if (parentCategory) {
          category = { id: parentCategory.id, name: parentCategory.name };
        }
      }
    }

    try {
      const response = await fetch(REVISION_STATUS_UPDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            id: interaction.user.id,
            username: interaction.user.username,
            tag: interaction.user.tag,
          },
          guild: interaction.guild
            ? { id: interaction.guild.id, name: interaction.guild.name }
            : null,
          channel: {
            id: interaction.channelId,
            name: interaction.channel?.name ?? null,
            isThread,
            threadId: isThread ? channel!.id : null,
            parentChannelId: isThread ? channel!.parentId : null,
          },
          category,
          selected_stage,
          status,           // always "In Progress"
          revision_note,    // always ""
          timestamp: new Date().toISOString(),
          source: "revision_status_update",
        }),
      });

      let reply = "⏳ Updating project status...";
      try {
        const data = await response.json();
        if (typeof data?.message === "string") reply = data.message;
      } catch {}

      await interaction.editReply(reply);
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Failed to update project status.");
    }
  },

  cooldown: 3,
};

export default updateProjectStatusCommand;
