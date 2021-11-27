import type { Message } from "https://deno.land/x/harmony/src/structures/message.ts";
import type { CommandClient } from "https://deno.land/x/harmony/src/commands/client.ts";
import { parseArgs } from "https://deno.land/x/harmony/src/utils/command.ts";
import { parseCommand } from "https://deno.land/x/harmony/src/commands/command.ts";

export { CommandClient } from "https://deno.land/x/harmony/src/commands/client.ts";
export { Message } from "https://deno.land/x/harmony/src/structures/message.ts";


export async function processMessage(client: CommandClient, msg: Message) {
  if (!client.allowBots && msg.author.bot === true) return;

  const isUserBlacklisted = await client.isUserBlacklisted(msg.author.id);
  if (isUserBlacklisted) return;

  const isChannelBlacklisted = await client.isChannelBlacklisted(msg.channel.id);
  if (isChannelBlacklisted) return;

  if (msg.guild !== undefined) {
    const isGuildBlacklisted = await client.isGuildBlacklisted(msg.guild.id);
    if (isGuildBlacklisted) return;
  }

  let prefix: string | string[] = [];
  if (typeof client.prefix === "string") prefix = [...prefix, client.prefix];
  else prefix = [...prefix, ...client.prefix];

  const userPrefix = await client.getUserPrefix(msg.author.id);
  if (userPrefix !== undefined) {
    if (typeof userPrefix === "string") prefix = [...prefix, userPrefix];
    else prefix = [...prefix, ...userPrefix];
  }

  if (msg.guild !== undefined) {
    const guildPrefix = await client.getGuildPrefix(msg.guild.id);
    if (guildPrefix !== undefined) {
      if (typeof guildPrefix === "string") prefix = [...prefix, guildPrefix];
      else prefix = [...prefix, ...guildPrefix];
    }
  }

  prefix = [...new Set(prefix)];

  let mentionPrefix = false;

  let usedPrefix = prefix
    .filter((v) => msg.content.startsWith(v))
    .sort((b, a) => a.length - b.length)[0];
  if (usedPrefix === undefined && client.mentionPrefix) mentionPrefix = true;

  if (mentionPrefix) {
    if (msg.content.startsWith(client.user?.mention as string) === true) {
      usedPrefix = client.user?.mention as string;
    } else if (
      msg.content.startsWith(client.user?.nickMention as string) === true
    ) {
      usedPrefix = client.user?.nickMention as string;
    } else return;
  }

  if (typeof usedPrefix !== "string") return;
  prefix = usedPrefix;

  const parsed = parseCommand(client, msg, prefix);
  if (parsed === undefined) return;
  const command = client.commands.fetch(parsed);

  if (command === undefined) return client.emit("commandNotFound", msg, parsed);
  const category = command.category !== undefined
    ? client.categories.get(command.category)
    : undefined;

  // Guild whitelist exists, and if does and Command used in a Guild, is client Guild allowed?
  // client is a bit confusing here, if these settings on a Command exist, and also do on Category, Command overrides them
  if (
    command.whitelistedGuilds === undefined &&
    category?.whitelistedGuilds !== undefined &&
    msg.guild !== undefined &&
    category.whitelistedGuilds.includes(msg.guild.id) === false
  ) {
    return;
  }
  if (
    command.whitelistedGuilds !== undefined &&
    msg.guild !== undefined &&
    command.whitelistedGuilds.includes(msg.guild.id) === false
  ) {
    return;
  }

  // Checks for Channel Whitelist
  if (
    command.whitelistedChannels === undefined &&
    category?.whitelistedChannels !== undefined &&
    category.whitelistedChannels.includes(msg.channel.id) === false
  ) {
    return;
  }
  if (
    command.whitelistedChannels !== undefined &&
    command.whitelistedChannels.includes(msg.channel.id) === false
  ) {
    return;
  }

  // Checks for Users Whitelist
  if (
    command.whitelistedUsers === undefined &&
    category?.whitelistedUsers !== undefined &&
    category.whitelistedUsers.includes(msg.author.id) === false
  ) {
    return;
  }
  if (
    command.whitelistedUsers !== undefined &&
    command.whitelistedUsers.includes(msg.author.id) === false
  ) {
    return;
  }

  return {
    client: client,
    name: parsed.name,
    prefix,
    rawArgs: parsed.args,
    args: await parseArgs(command.args, parsed.args, msg),
    argString: parsed.argString,
    message: msg,
    author: msg.author,
    member: msg.member,
    command,
    channel: msg.channel,
    guild: msg.guild,
  };
}
