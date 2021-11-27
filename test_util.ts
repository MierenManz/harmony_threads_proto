import type { Message } from "https://deno.land/x/harmony/src/structures/message.ts";
import type { CommandClient } from "https://deno.land/x/harmony/src/commands/client.ts";
import { parseArgs } from "https://deno.land/x/harmony/src/utils/command.ts";
import { parseCommand } from "https://deno.land/x/harmony/src/commands/command.ts";

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

  const ctx = {
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

  // In these checks too, Command overrides Category if present
  // Checks if Command is only for Owners
  if (
    (command.ownerOnly !== undefined || category === undefined
        ? command.ownerOnly
        : category.ownerOnly) === true &&
    !client.owners.includes(msg.author.id)
  ) {
    return client.emit("commandOwnerOnly", ctx);
  }

  // Checks if Command is only for Guild
  if (
    (command.guildOnly !== undefined || category === undefined
        ? command.guildOnly
        : category.guildOnly) === true &&
    msg.guild === undefined
  ) {
    return client.emit("commandGuildOnly", ctx);
  }

  // Checks if Command is only for DMs
  if (
    (command.dmOnly !== undefined || category === undefined
        ? command.dmOnly
        : category.dmOnly) === true &&
    msg.guild !== undefined
  ) {
    return client.emit("commandDmOnly", ctx);
  }

  if (
    command.nsfw === true &&
    (msg.guild === undefined ||
      (msg.channel as any).nsfw !== true)
  ) {
    return client.emit("commandNSFW", ctx);
  }

  const allPermissions = command.permissions !== undefined
    ? command.permissions
    : category?.permissions;

  if (
    (command.botPermissions !== undefined ||
      category?.botPermissions !== undefined ||
      allPermissions !== undefined) &&
    msg.guild !== undefined
  ) {
    // TODO: Check Overwrites too
    const me = await msg.guild.me();
    const missing: string[] = [];

    let permissions = command.botPermissions === undefined
      ? category?.permissions
      : command.botPermissions;

    if (permissions !== undefined) {
      if (typeof permissions === "string") permissions = [permissions];

      if (allPermissions !== undefined) {
        permissions = [...new Set(...permissions, ...allPermissions)];
      }

      for (const perm of permissions) {
        if (me.permissions.has(perm) === false) missing.push(perm);
      }

      if (missing.length !== 0) {
        return client.emit("commandBotMissingPermissions", ctx, missing);
      }
    }
  }

  if (
    (command.userPermissions !== undefined ||
      category?.userPermissions !== undefined ||
      allPermissions !== undefined) &&
    msg.guild !== undefined
  ) {
    let permissions = command.userPermissions !== undefined
      ? command.userPermissions
      : category?.userPermissions;

    if (permissions !== undefined) {
      if (typeof permissions === "string") permissions = [permissions];

      if (allPermissions !== undefined) {
        permissions = [...new Set(...permissions, ...allPermissions)];
      }

      const missing: string[] = [];

      for (const perm of permissions) {
        const has = msg.member?.permissions.has(perm);
        if (has !== true) missing.push(perm);
      }

      if (missing.length !== 0) {
        return client.emit("commandUserMissingPermissions", ctx, missing);
      }
    }
  }

  if (
    command.args !== undefined &&
    (parsed.args.length === 0 || parsed.args.length < command.args.length)
  ) {
    try {
      return command.onMissingArgs(ctx);
    } catch (e) {
      return client.emit("commandMissingArgs", ctx);
    }
  }

  const lastNext = async (): Promise<void> => {
    try {
      client.emit("commandUsed", ctx);
      const beforeExecute = await command.beforeExecute(ctx);
      if (beforeExecute === false) return;

      const result = await command.execute(ctx);
      await command.afterExecute(ctx, result);
    } catch (e) {
      try {
        await command.onError(ctx, e as Error);
      } catch (e) {
        client.emit("commandError", ctx, e as Error);
      }
      client.emit("commandError", ctx, e as Error);
    }
  };

  if (client.middlewares.length === 0) await lastNext();
  else {
    const createNext = (index: number) => {
      const fn = client.middlewares[index + 1] ?? lastNext;
      return () => fn(ctx, createNext(index + 1));
    };

    const middleware = client.middlewares[0];
    const next = createNext(0);

    await middleware(ctx, next);
  }
}
