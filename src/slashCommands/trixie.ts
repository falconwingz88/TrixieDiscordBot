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
const REVISION_STATUS_UPDATE_URL = 
  "https://primary-production-cc89.up.railway.app/webhook/neotrix-update-production-status-stage"; // revision webhook url
const RENAME_WEBHOOK_URL =
  "https://primary-production-cc89.up.railway.app/webhook/neotrix-rename-discord-notion-page-title"; // <-- rename webhook url

const WEBHOOK_TIMEOUT_MS = 180_000; // 3 minutes

/* =======================
   HELPER
======================= */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

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
        .setName("extract_slides")
        .setDescription("Extract slides and follow automation instructions")
    )
    .addSubcommand(sub =>
      sub
        .setName("send_updates")
        .setDescription("Send a Discord context preview to the backend")
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
        )
        .addStringOption(option =>
          option
            .setName("caption")
            .setDescription("Caption for this update")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("update_status")
        .setDescription("Update revision status")
        .addStringOption(option =>
          option
            .setName("status")
            .setDescription("Select revision status")
            .setRequired(true)
            .addChoices(
              { name: "Not started", value: "Not started" },
              { name: "In progress", value: "In progress" },
              { name: "In Review", value: "In Review" },
              { name: "revision", value: "revision" },
              { name: "Done", value: "Done" }
            )
        )
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
        )
        .addStringOption(option =>
          option
            .setName("revision_note")
            .setDescription("Optional revision note")
            .setRequired(false)
        )

    )
    .addSubcommand(sub =>
      sub
        .setName("rename_page")
        .setDescription("Rename current page title")
        .addStringOption(option =>
          option
            .setName("page_name")
            .setDescription("New page title")
            .setRequired(true)
        )
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

      const stage = interaction.options.getString("stage", true);
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
        const response = await fetchWithTimeout(
          WEBHOOK_URL,
          {
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
              stage, // <-- Stage ditambahkan di sini
              caption,
              timestamp: new Date().toISOString(),
              source: "send_updates",
            }),
          },
          WEBHOOK_TIMEOUT_MS
        );

        const data = await response.json();
        if (typeof data?.message !== "string") throw new Error("No message returned");

        await interaction.editReply(data.message);
      } catch (err: any) {
        console.error(err);
        if (err.name === "AbortError") {
          await interaction.editReply(
            `⏱️ <@&1321122630744412241> Webhook timed out after ${WEBHOOK_TIMEOUT_MS / 1000}s — no response from workflow service.`
          );
        } else {
          await interaction.editReply(
            `❌ <@&1321122630744412241> Failed to contact workflow service.`
          );
        }
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

    /* =======================
        /trixie update_status
    ======================= */
    if (sub === "update_status") {
      await interaction.deferReply({ ephemeral: false });

      const selected_stage = interaction.options.getString("stage", true);
      const status = interaction.options.getString("status", true);
      const revisionNote = interaction.options.getString("revision_note") || "";

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
        const response = await fetchWithTimeout(
          REVISION_STATUS_UPDATE_URL,
          {
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
              status,
              revision_note: revisionNote,
              timestamp: new Date().toISOString(),
              source: "revision_status_update",
            }),
          },
          WEBHOOK_TIMEOUT_MS
        );

        const data = await response.json();
        if (typeof data?.message !== "string") throw new Error("No message returned");

        await interaction.editReply(data.message);
      } catch (err: any) {
        console.error(err);
        if (err.name === "AbortError") {
          await interaction.editReply(
            `⏱️ <@&1321122630744412241> Webhook timed out after ${WEBHOOK_TIMEOUT_MS / 1000}s — no response from workflow service.`
          );
        } else {
          await interaction.editReply(
            `❌ <@&1321122630744412241> Failed to update revision status.`
          );
        }
      }

      return;
    }

    /* =======================
      /trixie rename_page
    ======================= */
    if (sub === "rename_page") {
      await interaction.deferReply({ ephemeral: false });

      const new_page_name = interaction.options.getString("page_name", true);

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
        const response = await fetchWithTimeout(
          RENAME_WEBHOOK_URL,
          {
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
              new_page_name,
              timestamp: new Date().toISOString(),
              source: "rename",
            }),
          },
          WEBHOOK_TIMEOUT_MS
        );

        const data = await response.json();
        if (typeof data?.message !== "string") throw new Error("No message returned");

        await interaction.editReply(data.message);
      } catch (err: any) {
        console.error(err);
        if (err.name === "AbortError") {
          await interaction.editReply(
            `⏱️ <@&1321122630744412241> Webhook timed out after ${WEBHOOK_TIMEOUT_MS / 1000}s — no response from workflow service.`
          );
        } else {
          await interaction.editReply(
            `❌ <@&1321122630744412241> Failed to rename.`
          );
        }
      }

      return;
    }
  },
};

export default trixieCommand;