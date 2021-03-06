import { Message, PrivateChannel } from 'eris';
import uuid from 'uuid/v4';
import { Command } from '../class';
import { Client } from '..';

export default class DeleteAccount extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'deleteaccount';
    this.description = 'Delete an account on the Cloud VM';
    this.usage = `${this.client.config.prefix}deleteaccount [User Name | User ID | Email Address] [Reason]`;
    this.aliases = ['deleteacc', 'dacc', 'daccount', 'delete'];
    this.permissions = { roles: ['662163685439045632'] };
    this.guildOnly = true;
    this.enabled = true;
  }

  public async run(message: Message, args: string[]) {
    try {
      if (!args[1]) return this.client.commands.get('help').run(message, [this.name]);
      const account = await this.client.db.Account.findOne({ $or: [{ username: args[0] }, { userID: args[0] }, { emailAddress: args[0] }] });
      if (!account) return message.channel.createMessage(`${this.client.stores.emojis.error} ***Account not found.***`);
      const { root, username, userID, emailAddress, homepath } = account;
      if (root) return message.channel.createMessage(`${this.client.stores.emojis.error} ***Permission denied.***`);

      const pad = (number: number, amount: number): string => '0'.repeat(amount - number.toString().length) + number;
      const randomNumber = Math.floor(Math.random() * 9999);
      const verify = pad(randomNumber, 4);
      try {
        await this.client.util.messageCollector(message,
          `***Please confirm that you are permanently deleting ${username}'s account by entering ${verify}. This action cannot be reversed.***`,
          15000, true, [verify], (msg) => !(message.channel instanceof PrivateChannel && msg.author.id === message.author.id));
      } catch (error) {
        if (error.message.includes('Did not supply')) return message;
        throw error;
      }

      const deleting = await message.channel.createMessage(`${this.client.stores.emojis.loading} ***Deleting account, please wait...***`);
      const reason = args.slice(1).join(' ');
      const logInput = { username, userID, logID: uuid(), moderatorID: message.author.id, type: 4, date: new Date(), reason: null };
      if (reason) logInput.reason = reason;
      await this.client.util.createModerationLog(args[0], message.member, 4, reason);
      await this.client.util.deleteAccount(username);

      this.client.util.transport.sendMail({
        to: account.emailAddress,
        from: 'Library of Code sp-us | Cloud Services <support@libraryofcode.org>',
        subject: 'Your account has been deleted',
        html: `
        <h1>Library of Code | Cloud Services</h1>
        <p>Your Cloud Account has been deleted by our Engineers. If your account was deleted due to infractions, this will not be appealable. We're sorry to see you go.</p>
        <p><b>Reason:</b> ${reason}</p>
        <p><b>Engineer:</b> ${message.author.username}</p>
        
        <b><i>Library of Code sp-us | Support Team</i></b>
        `,
      });

      return deleting.edit(`${this.client.stores.emojis.success} ***Account ${username} has been deleted by Engineer ${message.author.username}#${message.author.discriminator}***`);
    } catch (error) {
      return this.client.util.handleError(error, message, this);
    }
  }
}
