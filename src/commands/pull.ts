import { Message } from 'eris';
import { Client } from '..';
import { Command } from '../class';

export default class Pull extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'pull';
    this.description = 'Fetches the latest commit from Gitlab';
    this.aliases = ['update'];
    this.enabled = true;
    this.permissions = { roles: ['525441307037007902'] };
  }

  public async run(message: Message) {
    try {
      if (this.client.updating) return message.channel.createMessage(`${this.client.stores.emojis.error} ***Update in progress***`);
      this.client.updating = true;
      const updateMessage = await message.channel.createMessage(`${this.client.stores.emojis.loading} ***Fetching latest commit...***\n\`\`\`sh\n$ git pull\n\`\`\``);
      let pull: string;

      try {
        pull = await this.client.util.exec('git pull', { cwd: '/var/CloudServices' });
      } catch (error) {
        const updatedMessage = updateMessage.content.replace(`${this.client.stores.emojis.loading} ***Fetching latest commit...***`, `${this.client.stores.emojis.error} ***Could not fetch latest commit***`)
          .replace(/```$/, `${error.message}\n\`\`\``);
        this.client.updating = false;
        return updateMessage.edit(updatedMessage);
      }
      if (pull.includes('Already up to date')) {
        const updatedMessage = updateMessage.content.replace(`${this.client.stores.emojis.loading} ***Fetching latest commit...***`, `${this.client.stores.emojis.success} ***No updates available***`)
          .replace(/```$/, `${pull}\n\`\`\``);
        this.client.updating = false;
        return updateMessage.edit(updatedMessage);
      }
      if (!pull.includes('origin/master') && !pull.includes(' changed, ')) {
        const updatedMessage = updateMessage.content.replace(`${this.client.stores.emojis.loading} ***Fetching latest commit...***`, `${this.client.stores.emojis.error} ***Unexpected git output***`)
          .replace(/```$/, `${pull}\n\`\`\``);
        this.client.updating = false;
        return updateMessage.edit(updatedMessage);
      }
      const continueMessage = updateMessage.content.replace(`${this.client.stores.emojis.loading} ***Fetching latest commit...***`, `${this.client.stores.emojis.success} ***Pulled latest commit***\n${this.client.stores.emojis.loading} ***Reinstalling dependencies...***`)
        .replace(/```$/, `${pull}\n$ yarn install\n\`\`\``);
      const passedPull = await updateMessage.edit(continueMessage);


      let install: string;
      try {
        install = await this.client.util.exec('yarn install', { cwd: '/var/CloudServices' });
      } catch (error) {
        this.client.updating = false;
        const updatedMessage = passedPull.content.replace(`${this.client.stores.emojis.loading} ***Reinstalling dependencies...***`, `${this.client.stores.emojis.error} ***Failed to reinstall dependencies***`)
          .replace(/```$/, `${error.message}\n\`\`\``);
        return updateMessage.edit(updatedMessage);
      }
      let updatedPackages: Message;
      if (install.includes('Already up-to-date')) {
        const updatedMessage = passedPull.content.replace(`${this.client.stores.emojis.loading} ***Reinstalling dependencies...***`, `${this.client.stores.emojis.success} ***No dependency updates available***\n${this.client.stores.emojis.loading} ***Rebuilding files...***`)
          .replace(/```$/, `${install}\n$ yarn run build\n\`\`\``);
        updatedPackages = await updateMessage.edit(updatedMessage);
      } else if (install.includes('success Saved lockfile.')) {
        const updatedMessage = passedPull.content.replace(`${this.client.stores.emojis.loading} ***Reinstalling dependencies...***`, `${this.client.stores.emojis.success} ***Updated dependencies***\n${this.client.stores.emojis.loading} ***Rebuilding files...***`)
          .replace(/```$/, `${install}\n$ yarn run build\n\`\`\``);
        updatedPackages = await updateMessage.edit(updatedMessage);
      } else {
        const updatedMessage = passedPull.content.replace(`${this.client.stores.emojis.loading} ***Reinstalling dependencies...***`, `${this.client.stores.emojis.error} ***Unexpected yarn install output***`)
          .replace(/```$/, `${pull}\n\`\`\``);
        this.client.updating = false;
        return updateMessage.edit(updatedMessage);
      }

      let build: string;
      try {
        build = await this.client.util.exec('yarn run build', { cwd: '/var/CloudServices' });
      } catch (error) {
        const updatedMessage = updatedPackages.content.replace(`${this.client.stores.emojis.loading} ***Rebuilding files...***`, `${this.client.stores.emojis.error} ***Failed to rebuild files***`)
          .replace(/```$/, `${error.message}\n\`\`\``);
        this.client.buildError = true;
        this.client.updating = false;
        return updateMessage.edit(updatedMessage);
      }
      const finalMessage = updatedPackages.content.replace(`${this.client.stores.emojis.loading} ***Rebuilding files...***`, `${this.client.stores.emojis.success} ***Files rebuilt***`)
        .replace(/```$/, `${build}\n\`\`\``);
      this.client.updating = false;
      this.client.buildError = false;
      return updateMessage.edit(finalMessage);
    } catch (error) {
      this.client.updating = false;
      return this.client.util.handleError(error, message, this);
    }
  }
}
