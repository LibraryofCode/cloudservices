/* eslint-disable consistent-return */
import { Message } from 'eris';
import { Command } from '../class';
import { Client } from '..';

export default class Bearer extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'bearer';
    this.description = 'Creates a bearer token.';
    this.usage = `${this.client.config.prefix}bearer`;
    this.guildOnly = false;
    this.enabled = true;
  }

  public async run(message: Message) {
    try {
      const account = await this.client.db.Account.findOne({ userID: message.author.id });
      if (!account) return message.channel.createMessage(`${this.client.stores.emojis.error} ***Account not found***`);
      // eslint-disable-next-line no-underscore-dangle
      const bearer = await this.client.server.security.createBearer(account._id);
      const dm = await this.client.getDMChannel(message.author.id);
      const msg = await dm.createMessage(`__**Library of Code sp-us | Cloud Services [API]**__\n*This message will automatically be deleted in 60 seconds, copy the token and save it. You cannot recover it.*\n\n${bearer}`);
      message.channel.createMessage(`***${this.client.stores.emojis.success} Bearer token sent to direct messages.***`);
      setTimeout(() => {
        msg.delete();
      }, 60000);
    } catch (error) {
      return this.client.util.handleError(error, message, this);
    }
  }
}
