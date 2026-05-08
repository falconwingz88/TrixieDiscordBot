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
  //"https://primary-production-cc89.up.railway.app/form/b97a75c0-6184-46f8-b5d3-f9b3ed0ae8b1"; //project creation url
  "https://n8n-neotrix-production.tailfd96cd.ts.net/form/d0fc9056-ca45-41f3-9266-d1465e64e482";
const WEBHOOK_URL =
  //"https://primary-production-cc89.up.railway.app/webhook/neotrix-sendupdates-to-notion";//send updates webhook url
  "https://n8n-neotrix-production.tailfd96cd.ts.net/webhook/neotrix-sendupdates-to-notion";
const EXTRACT_SLIDES_GUIDE_URL =
  "https://www.notion.so/neotrix/Selection-Distribution-Automation-2f1032d70c33807b8b35e20c4a496fbe";
const REVISION_STATUS_UPDATE_URL = 
  //"https://primary-production-cc89.up.railway.app/webhook/neotrix-update-production-status-stage"; // revision webhook url
  "https://n8n-neotrix-production.tailfd96cd.ts.net/webhook/neotrix-update-production-status-stage";
const RENAME_WEBHOOK_URL =
 //"https://primary-production-cc89.up.railway.app/webhook/neotrix-rename-discord-notion-page-title"; // <-- rename webhook url
  "https://n8n-neotrix-production.tailfd96cd.ts.net/webhook/neotrix-rename-discord-notion-page-title";
const GET_CREATED_WEBHOOK_URL =
  "https://n8n-neotrix-production.tailfd96cd.ts.net/webhook/get-created";
const DELETE_PROJECT_WEBHOOK_URL =
  "https://n8n-neotrix-production.tailfd96cd.ts.net/webhook/delete-project";

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
            .setDescription("change production stage to in review")
            .setRequired(false)
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
    )
    .addSubcommand(sub =>
      sub
        .setName("get_project")
        .setDescription("Get a list of created projects and their category IDs")
    )
    .addSubcommand(sub =>
      sub
        .setName("delete_project")
        .setDescription(" HATI-HATI! Delete a project using its Discord Category ID")
        .addStringOption(option =>
          option
            .setName("category_id")
            .setDescription("Input Discord Category ID dari project yang ingin dihapus")
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

      const stage = interaction.options.getString("stage") || "";
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

    /* =======================
       /trixie get_project
    ======================= */
    if (sub === "get_project") {
      // Defer reply karena fetch ke N8N mungkin memakan waktu beberapa detik
      await interaction.deferReply({ ephemeral: false });

      try {
        const response = await fetchWithTimeout(
          GET_CREATED_WEBHOOK_URL,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
          WEBHOOK_TIMEOUT_MS
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        // 1. Ubah jadi array otomatis kalau n8n cuma kirim 1 objek
        const projectArray = Array.isArray(data) ? data : [data];

        // 2. Validasi jika data kosong atau tidak punya 'project_ids'
        if (projectArray.length === 0 || !projectArray[0]?.project_ids) {
          await interaction.editReply("📭 Tidak ada project yang ditemukan atau format data tidak sesuai.");
          return;
        }

        // 3. Mapping data untuk mengambil nama project dan category ID
        const projectList = projectArray.map((item, index) => {
          const projectName = item.project_ids?.project_name || "Unknown Project";
          const categoryId = item.project_ids?.discord_category_id || "Unknown ID";
          
          return `**${index + 1}. ${projectName}**\n↳ Category ID: \`${categoryId}\``;
        }).join("\n\n");

        // 4. Membungkus list ke dalam Embed
        const embed = new EmbedBuilder()
          .setTitle("📁 List of Created Projects")
          .setDescription(projectList)
          .setColor(0x5865f2)
          .setFooter({ text: `Total Projects: ${projectArray.length}` });

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        console.error(err);
        if (err.name === "AbortError") {
          await interaction.editReply(
            `⏱️ <@&1468897007530672202> Webhook timed out after ${WEBHOOK_TIMEOUT_MS / 1000}s — no response from workflow service.`
          );
        } else {
          await interaction.editReply(
            `❌ <@&1468897007530672202> Failed to fetch project list dari webhook.`
          );
        }
      }
      return;
    }
    /* =======================
       /trixie delete_project
    ======================= */
    if (sub === "delete_project") {
      await interaction.deferReply({ ephemeral: false });

      const categoryId = interaction.options.getString("category_id", true);

      try {
        const response = await fetchWithTimeout(
          DELETE_PROJECT_WEBHOOK_URL,
          {
            method: "POST", // Menggunakan POST untuk mengirim payload ke n8n
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              discord_category_id: categoryId,
              // Anda bisa mengirim info user juga jika dibutuhkan n8n untuk log
              user_id: interaction.user.id, 
              username: interaction.user.username 
            }),
          },
          WEBHOOK_TIMEOUT_MS
        );

        const data = await response.json();
        
        // Asumsi balasan dari n8n memiliki format {"status": "success"} atau text langsung
        // Kita ubah ke string lowercase untuk mempermudah pengecekan kondisi
        const responseStatus = (data.status || data.message || String(data)).toLowerCase();

        if (responseStatus.includes("success")) {
          await interaction.editReply(`✅ **Sukses**: Project dengan Category ID \`${categoryId}\` berhasil dihapus.`);
        } else if (responseStatus.includes("not found")) {
          await interaction.editReply(`⚠️ **Not Found**: Project ini belum bisa dihapus menggunakan command ini.`);
        } else {
          // Jatuh ke kondisi 'failed' atau error lainnya
          await interaction.editReply(`❌ **Failed**: Gagal menghapus project dengan Category ID \`${categoryId}\`.`);
        }

      } catch (err: any) {
        console.error(err);
        if (err.name === "AbortError") {
          await interaction.editReply(
            `⏱️ <@&1468897007530672202> Webhook timed out after ${WEBHOOK_TIMEOUT_MS / 1000}s — tidak ada respons dari workflow n8n.`
          );
        } else {
          await interaction.editReply(
            `❌ <@&1468897007530672202> Gagal menghubungi webhook delete-project.`
          );
        }
      }
      return;
    }
  },
};

export default trixieCommand;