import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { SlashCommand } from "../types";
import { PERMISSIONS } from "../config";

/* =======================
   CONFIG
======================= */
const FORM_URL =
  "https://primary-production-cc89.up.railway.app/form/b97a75c0-6184-46f8-b5d3-f9b3ed0ae8b1"; //project creation url

const WEBHOOK_URL =
  "https://primary-production-cc89.up.railway.app/webhook/neotrix-sendupdates-to-notion";//send updates webhook url
const EXTRACT_SLIDES_GUIDE_URL =
  "https://www.notion.so/neotrix/Selection-Distribution-Automation-2f1032d70c33807b8b35e20c4a496fbe";

/* =======================
   COMMAND
======================= */
const trixieCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("trixie")
    .setDescription("Trixie main command")

    .addSubcommand(sub =>
      sub
        .setName("create_project")
        .setDescription("Open project creation form")
    )

    .addSubcommand(sub =>
      sub
        .setName("send_updates")
        .setDescription("Send a Discord context preview to the backend")
        .addStringOption(option =>
          option
            .setName("caption")
            .setDescription("Caption for this update")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("extract_slides")
        .setDescription("Extract slides and follow automation instructions")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    /* =======================
       ROLE GUARD (SHARED)
    ======================= */
    if (interaction.inGuild()) {
      const member = interaction.member as GuildMember;
      const allowed = member.roles.cache.some(role =>
        PERMISSIONS.PROJECT_CREATE.includes(role.id)
      );

      if (!allowed) {
        await interaction.reply({
          content: "❌ You are not allowed to use this command.",
          ephemeral: false,
        });
        return;
      }
    }

    /* =======================
       /trixie create_project
    ======================= */
    if (sub === "create_project") {
      const embed = new EmbedBuilder()
        .setTitle("🚀 Create New Project")
        .setDescription(
          [
            "Use the form below to create a new project.",
            "",
            "**What will happen automatically:**",
            "• A new project page will be created in Notion",
            "• A Discord category will be created",
            "• A project role will be generated",
            "",
            "**Steps:**",
            "1. Click the **Create Project** button",
            "2. Fill in the form",
            "3. Submit and wait a few seconds",
          ].join("\n")
        )
        .setColor(0x5865f2);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Create Project")
          .setStyle(ButtonStyle.Link)
          .setURL(FORM_URL)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false,
      });
      return;
    }

    /* =======================
       /trixie send_updates
    ======================= */
    if (sub === "send_updates") {
      await interaction.deferReply({ ephemeral: false });

      const caption = interaction.options.getString("caption") || "";

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

      const roles = interaction.inGuild()
        ? (interaction.member as GuildMember).roles.cache
            .filter(r => r.id !== interaction.guild?.id)
            .map(r => ({ id: r.id, name: r.name }))
        : [];

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: {
              id: interaction.user.id,
              username: interaction.user.username,
              tag: interaction.user.tag,
            },
            roles,
            guild: interaction.guild
              ? { id: interaction.guild.id, name: interaction.guild.name }
              : null,
            channel: {
              id: interaction.channelId,
              name: channel?.name ?? null,
              isThread,
              threadId: isThread ? channel!.id : null,
              parentChannelId: isThread ? channel!.parentId : null,
            },
            category,
            caption, // 👈 NEW FIELD
            timestamp: new Date().toISOString(),
            source: "send_updates",
          }),
        });

        let reply = "⏳ Processing…";
        try {
          const data = await response.json();
          if (typeof data?.message === "string") reply = data.message;
        } catch {}

        await interaction.editReply(reply);
      } catch (err) {
        console.error(err);
        await interaction.editReply("❌ Failed to contact workflow service.");
      }
    }
    /* =======================
      /trixie extract_slides
    ======================= */
    if (sub === "extract_slides") {
      const embed = new EmbedBuilder()
        .setTitle("🧩 Extract Slides")
        .setDescription(
          [
            "Use the guide below to extract slides using the automation workflow.",
            "",
            "**What will happen:**",
            "• You will follow the Selection & Distribution automation",
            "• Slides will be processed based on the instructions",
            "",
            "**Steps:**",
            "1. Click the **Open Guide** button",
            "2. Follow all instructions on the Notion page",
            "3. Complete the process as described",
          ].join("\n")
        )
        .setColor(0x57f287);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Open Guide")
          .setStyle(ButtonStyle.Link)
          .setURL(EXTRACT_SLIDES_GUIDE_URL)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false,
      });
      return;
    }
  },
};

export default trixieCommand;
