/* eslint-disable no-eval */
import { Message } from 'eris';
import { inspect } from 'util';
import axios from 'axios';
import { Client, config } from '..';
import { Command } from '../class';

export default class Eval extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'eval';
    this.aliases = ['e'];
    this.description = 'Evaluate JavaScript code';
    this.enabled = true;
    this.permissions = { users: ['253600545972027394', '278620217221971968'] };
  }

  public async run(message: Message) {
    try {
      const evalMessage = message.content.slice(config.prefix.length).split(' ').slice(1).join(' ');
      let evaled: any;
      let output: string;

      try {
        evaled = await eval(evalMessage);
        if (typeof evaled !== 'string') output = output && inspect(evaled, { depth: 1 });
      } catch (error) {
        output = error.stack;
      }

      if (output) {
        output = output.replace(RegExp(config.prefix, 'gi'), 'juul');
        output = output.replace(RegExp(config.emailPass, 'gi'), 'juul');
        output = output.replace(RegExp(config.cloudflare, 'gi'), 'juul');
      }

      const display = this.client.util.splitString(output, 1975);
      if (display[5]) {
        try {
          const { data } = await axios.post('https://snippets.cloud.libraryofcode.org/documents', display.join(''));
          return message.channel.createMessage(`${this.client.stores.emojis.success} Your evaluation output can be found on https://snippets.cloud.libraryofcode.org/${data.key}`);
        } catch (error) {
          return message.channel.createMessage(`${this.client.stores.emojis.error} ${error}`);
        }
      }

      return display.forEach((m) => message.channel.createMessage(`\`\`\`js\n${m}\n\`\`\``));
    } catch (error) {
      return this.client.util.handleError(error, message, this);
    }
  }
}