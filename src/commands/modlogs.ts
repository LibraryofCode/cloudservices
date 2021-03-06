import { Message } from 'eris';
// eslint-disable-next-line import/no-unresolved
import { createPaginationEmbed } from 'eris-pagination';
import { Client } from '..';
import { Command, RichEmbed } from '../class';

export default class Modlogs extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'modlogs';
    this.description = 'Check a user\'s Cloud Modlogs';
    this.aliases = ['infractions', 'modlog'];
    this.enabled = true;
    this.permissions = { roles: ['446104438969466890'] };
  }

  public async run(message: Message, args: string[]) {
    try {
      if (!args.length) return this.client.commands.get('help').run(message, [this.name]);
      const msg: Message = await message.channel.createMessage(`***${this.client.stores.emojis.loading} Locating modlogs...***`);
      const query = await this.client.db.Moderation.find({ $or: [{ username: args.join(' ') }, { userID: args.filter((a) => a)[0].replace(/[<@!>]/g, '') }] });
      if (!query.length) return msg.edit(`***${this.client.stores.emojis.error} Cannot locate modlogs for ${args.join(' ')}***`);

      // @ts-ignore
      const formatted = query.sort((a, b) => a.date - b.date).map((log) => {
        const { username, moderatorID, reason, type, date, logID } = log;
        let name: string;
        switch (type) {
          default: name = 'Generic'; break;
          case 0: name = 'Create'; break;
          case 1: name = 'Warn'; break;
          case 2: name = 'Lock'; break;
          case 3: name = 'Unlock'; break;
          case 4: name = 'Delete'; break;
        }
        const value = `**ID:** ${logID}\n**Account name:** ${username}\n**Moderator:** <@${moderatorID}>\n**Reason:** ${reason || 'Not supplied'}\n**Date:** ${date.toLocaleString('en-us')} EST`;
        const inline = true;
        return { name, value, inline };
      });
      const users = [...new Set(query.map((log) => log.userID))].map((u) => `<@${u}>`);

      const logs = this.client.util.splitFields(formatted);

      const embeds = logs.map((l) => {
        const embed = new RichEmbed();
        embed.setDescription(`List of Cloud moderation logs for ${users.join(', ')}`);
        embed.setAuthor('Library of Code | Cloud Services', this.client.user.avatarURL, 'https://libraryofcode.org/');
        embed.setTitle('Cloud Modlogs/Infractions');
        embed.setFooter(`Requested by ${message.author.username}#${message.author.discriminator}`, message.author.avatarURL);
        l.forEach((f) => embed.addField(f.name, f.value, f.inline));
        embed.setTimestamp();
        embed.setColor(3447003);
        return embed;
      });

      if (embeds.length === 1) {
        // @ts-ignore
        msg.edit({ content: '', embed: embeds[0] });
      } else {
        // @ts-ignore
        createPaginationEmbed(message, this.client, embeds, {}, msg);
      }
      return msg;
    } catch (error) {
      return this.client.util.handleError(error, message, this);
    }
  }
}
