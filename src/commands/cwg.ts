import fs from 'fs-extra';
import axios from 'axios';
import x509 from '@ghaiklor/x509';
import { Message } from 'eris';
import { AccountInterface } from '../models';
import { Command, RichEmbed } from '../class';
import { Client, config } from '..';

export default class CWG extends Command {
  constructor(client: Client) {
    super(client);
    this.name = 'cwg';
    this.description = 'Manages aspects for the CWG.';
    this.usage = `${config.prefix}cwg [User ID/Username] [Domain] [Port] <Path to x509 certificate> <Path to x509 key>`;
    this.permissions = { roles: ['525441307037007902'] };
    this.enabled = true;
  }

  public async run(message: Message, args?: string[]) {
    if (!args.length) return this.client.commands.get('help').run(message, [this.name]);
    /*
    args[1] should be the user's ID OR account username; required
    args[2] should be the domain; required
    args[3] should be the port; required
    args[4] should be the path to the x509 certificate; not required
    args[5] should be the path to the x509 key; not required
    */
    if (args[0] === 'create') {
      const account = await this.client.db.Account.findOne({ $or: [{ account: args[1] }, { userID: args[1] }] });
      if (!account) return message.channel.createMessage(`${this.client.stores.emojis.error} Cannot locate account, please try again.`);
      try {
        const domain = await this.createDomain(account, args[2], Number(args[3]), { cert: args[4], key: args[5] });
        const embed = new RichEmbed();
        embed.setTitle('Domain Creation');
        embed.setColor(3066993);
        embed.addField('Account Username', account.username, true);
        embed.addField('Account ID', account.id, true);
        embed.addField('Engineer', `<@${message.author.id}>`, true);
        embed.addField('Domain', domain.domain, true);
        embed.addField('Port', String(domain.port), true);
        const cert = x509.parseCert(await fs.readFile(domain.x509.cert, { encoding: 'utf8' }));
        embed.addField('Certificate Issuer', cert.issuer.organizationName, true);
        embed.addField('Certificate Subject', cert.subject.commonName, true);
        embed.setFooter(this.client.user.username, this.client.user.avatarURL);
        embed.setTimestamp(new Date(message.timestamp));
        // @ts-ignore
        message.channel.createMessage({ embed });
        // @ts-ignore
        this.client.createMessage('580950455581147146', { embed });
        // @ts-ignore
        this.client.getDMChannel(account.userID).then((r) => r.createMessage({ embed }));
        await this.client.util.transport.sendMail({
          to: account.emailAddress,
          from: 'Library of Code sp-us | Support Team <support@libraryofcode.org>',
          subject: 'Your domain has been binded',
          html: `
          <h1>Library of Code sp-us | Cloud Services</h1>
          <p>Hello, this is an email informing you that a new domain under your account has been binded.
          Information is below.</p>
          <b>Domain:</b> ${domain.domain}
          <b>Port:</b> ${domain.port}
          <b>Certificate Issuer:</b> ${cert.issuer.organizationName}
          <b>Certificate Subject:</b> ${cert.subject.commonName}
          <b>Responsible Engineer:</b> ${message.author.username}#${message.author.discriminator}

          If you have any questions about additional setup, you can reply to this email or send a message in #cloud-support in our Discord server.
          
          <b><i>Library of Code sp-us | Support Team</i></b>
          `,
        });
        if (!domain.domain.includes('cloud.libraryofcode.org')) {
          const content = `_**DNS Record Setup**__\nYou recently a binded a custom domain to your Library of Code sp-us Account. You'll have to update your DNS records. We've provided the records below.\n\n\`${domain.domain} IN CNAME cloud.libraryofcode.us AUTO/500\`\nThis basically means you need to make a CNAME record with the key/host of ${domain.domain} and the value/point to cloud.libraryofcode.org. If you have any questions, don't hesitate to ask us.`;
          this.client.getDMChannel(account.userID).then((r) => r.createMessage(content));
        }
      } catch (err) {
        this.client.util.handleError(err, message, this);
      }
    } else { message.channel.createMessage(`${this.client.stores.emojis.error} Not a valid subcommand.`); }
    return true;
  }

  /**
   * This function binds a domain to a port on the CWG.
   * @param account The account of the user.
   * @param subdomain The domain to use. `mydomain.cloud.libraryofcode.org`
   * @param port The port to use, must be between 1024 and 65535.
   * @param x509 The paths to the certificate and key files. Must be already existant.
   * @example await CWG.createDomain('mydomain.cloud.libraryofcode.org', 6781);
   */
  public async createDomain(account: AccountInterface, domain: string, port: number, x509Certificate: { cert: string, key: string } = { cert: '/etc/nginx/ssl/cloud-org.chain.crt', key: '/etc/nginx/ssl/cloud-org.key.pem' }) {
    if (port <= 1024 || port >= 65535) throw new RangeError(`Port range must be between 1024 and 65535, received ${port}.`);
    if (await this.client.db.Domain.exists({ port })) throw new Error(`Port ${port} already exists in the database.`);
    if (await this.client.db.Domain.exists({ domain })) throw new Error(`Domain ${domain} already exists in the database.`);
    if (!await this.client.db.Account.exists({ userID: account.userID })) throw new Error(`Cannot find account ${account.userID}.`);
    await fs.access(x509Certificate.cert, fs.constants.R_OK);
    await fs.access(x509Certificate.key, fs.constants.R_OK);
    let cfg = await fs.readFile('./static/nginx.conf', { encoding: 'utf8' });
    cfg = cfg.replace(/\[DOMAIN]/g, domain);
    cfg = cfg.replace(/\[PORT]/g, String(port));
    cfg = cfg.replace(/\[CERTIFICATE]/g, x509Certificate.cert);
    cfg = cfg.replace(/\[KEY]/g, x509Certificate.key);
    await fs.writeFile(`/etc/nginx/sites-available/${domain}`, config, { encoding: 'utf8' });
    await fs.symlink(`/etc/nginx/sites-available/${domain}`, `/etc/nginx/sites-enabled/${domain}`);
    const entry = new this.client.db.Domain({
      account,
      domain,
      port,
      x509,
      enabled: true,
    });
    if (domain.includes('cloud.libraryofcode.org')) {
      await axios({
        method: 'post',
        url: 'https://api.cloudflare.com/client/v4/zones/5e82fc3111ed4fbf9f58caa34f7553a7/dns_records',
        headers: { Authorization: `Bearer ${this.client.config.cloudflare}`, 'Content-Type': 'application/json' },
        data: JSON.stringify({ type: 'CNAME', name: domain, content: 'cloud.libraryofcode.org', proxied: false }),
      });
    }
    return entry.save();
  }
}
