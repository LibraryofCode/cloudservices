import { Message } from 'eris';
import axios from 'axios';
import { Client } from '..';
import { Command } from '../class';

export default class Exec extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'exec';
    this.description = 'Executes command';
    this.aliases = ['ex'];
    this.enabled = true;
    this.permissions = { users: ['253600545972027394', '278620217221971968', '155698776512790528'] };
    this.guildOnly = false;
  }

  public async run(message: Message, args: string[]) {
    try {
      if (!args.length) return this.client.commands.get('help').run(message, [this.name]);

      const response = await message.channel.createMessage(`${this.client.stores.emojis.loading} ***Executing \`${args.join(' ')}\`***`);
      let result: string;
      try {
        result = await this.client.util.exec(args.join(' '), { cwd: '/var/CloudServices' });
      } catch (error) {
        result = error.message;
      }

      if (result.length <= 1975) return response.edit(`\`\`\`bash\n${result}\n\`\`\``);
      const splitResult = this.client.util.splitString(result, 1975);

      if (splitResult[5]) {
        try {
          const { data } = await axios.post('https://snippets.cloud.libraryofcode.org/documents', splitResult.join(''));
          return response.edit(`${this.client.stores.emojis.success} Your command execution output can be found on https://snippets.cloud.libraryofcode.org/${data.key}`);
        } catch (error) {
          return response.edit(`${this.client.stores.emojis.error} ${error}`);
        }
      }

      await response.delete();
      return splitResult.forEach((m) => message.channel.createMessage(`\`\`\`bash\n${m}\n\`\`\``));
    } catch (error) {
      return this.client.util.handleError(error, message, this);
    }
  }
}
