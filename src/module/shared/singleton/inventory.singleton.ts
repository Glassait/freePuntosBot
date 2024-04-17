import type { Client, Guild, TextChannel } from 'discord.js';
import { basename } from 'node:path';
import { CoreFile } from '../classes/core-file';
import { Logger } from '../classes/logger';
import { EmojiEnum } from '../enums/emoji.enum';
import type { Channel, DiscordId, FoldRecruitment, InventoryType, Trivia } from '../types/inventory.type';
import { EnvUtil } from '../utils/env.util';

/**
 * Class used to manage the inventory.json file
 * This class implement the Singleton pattern
 */
export class InventorySingleton extends CoreFile<InventoryType> {
    /**
     * The id of the dev channel for testing purposes
     */
    private readonly DEV_CHANNEL: Channel = { guild: '1218558386761891901', id: '1218558387361546412' };

    /**
     * Private constructor for the InventorySingleton class.
     * Initializes the instance by reading the json core file and performs additional setup.
     * If running in development mode, overrides channel configurations with a development channel.
     */
    private constructor() {
        super('./src/module/core', './src/module/core/backup', 'inventory.json');

        this.logger = new Logger(basename(__filename));

        this._data = JSON.parse(this.readFile().toString());

        if (EnvUtil.isDev() && 'channels' in this._data) {
            Object.keys(this._data.channels).forEach((channel: string): void => {
                this._data.channels[channel] = this.DEV_CHANNEL;
            });
        }

        this.backupData();
        this.logger.info(`${EmojiEnum.HAMMER} {} instance initialized`, InventorySingleton.name);
    }

    //region SINGLETON
    /**
     * The instance of the class, used for the singleton pattern
     */
    private static _instance: InventorySingleton | undefined;

    /**
     * Getter for {@link _instance}
     */
    public static get instance(): InventorySingleton {
        if (!this._instance) {
            this._instance = new InventorySingleton();
        }

        return this._instance;
    }
    //endregion

    //region TRIVIA
    /**
     * Get the trivia information from the inventory
     */
    public get trivia(): Trivia {
        return this._data.game.trivia;
    }

    /**
     * Update the trivia information with the new value and update the json file
     *
     * @param {Trivia} trivia - The new trivia value
     */
    public set trivia(trivia: Trivia) {
        this._data.game.trivia = trivia;
        this.writeData();
    }
    //endregion

    //region FOLD RECRUITMENT
    /**
     * Get the fold recruitment object from the inventory.
     */
    public get foldRecruitment(): FoldRecruitment {
        return this._data.fold_recruitment;
    }
    //endregion

    //region METHOD SCRAPPING
    /**
     * Get the channel in the discord server to send the news
     */
    public async getNewsLetterChannel(client: Client): Promise<TextChannel> {
        return await this.fetchChannel(client, this._data.channels.newsletter);
    }
    //endregion

    //region CHANNEL
    /**
     * Fetch the text channel instance for the trivia game.
     *
     * @param {Client} client - The Discord client instance.
     *
     * @returns {Promise<TextChannel>} - A promise that resolves to the text channel instance for the trivia game.
     *
     * @example
     * const discordClient = // ... obtained Discord client instance
     * const triviaChannel = await instance.getChannelForTrivia(discordClient);
     * console.log(triviaChannel); // Text channel instance for the trivia game
     */
    public async getChannelForTrivia(client: Client): Promise<TextChannel> {
        this.logger.debug('Channel instance fetch for the trivia game');
        return await this.fetchChannel(client, this._data.channels.trivia);
    }

    /**
     * Fetch the text channel instance for the fold recruitment.
     *
     * @param {Client} client - The Discord client instance.
     *
     * @returns {Promise<TextChannel>} - A promise that resolves to the text channel instance for the fold recruitment.
     *
     * @example
     * const discordClient = // ... obtained Discord client instance
     * const foldRecruitmentChannel = await instance.getChannelForFoldRecruitment(discordClient);
     * console.log(foldRecruitmentChannel); // Text channel instance for the fold recruitment
     */
    public async getChannelForFoldRecruitment(client: Client): Promise<TextChannel> {
        this.logger.debug('Channel instance fetch for the fold recruitment');
        return await this.fetchChannel(client, this._data.channels.fold_recruitment);
    }
    //endregion

    /**
     * Get the commands registered in the inventory
     *
     * @param {string} name - The name of the command
     *
     * @returns {DiscordId[]} - The list of the discord server id
     */
    public getCommands(name: string): DiscordId[] {
        const command: DiscordId[] = this._data.commands[name];

        if (!command) {
            throw new Error(`No command found with name ${name}`);
        }

        return command;
    }

    /**
     * Retrieves the state of a feature flipping based on its name.
     *
     * @param {string} feature - The name of the feature.
     * @returns {boolean | undefined} - Returns the state of the feature if found, or `undefined` if the feature is not present.
     *
     * @example
     * const isFeatureEnabled = instance.getFeatureFlipping('myFeature');
     * if (isFeatureEnabled !== undefined) {
     *   console.log(`Feature 'myFeature' is ${isFeatureEnabled ? 'enabled' : 'disabled'}`);
     * } else {
     *   console.log(`Feature 'myFeature' not found`);
     * }
     */
    public getFeatureFlipping(feature: string): boolean | undefined {
        return this._data.feature_flipping[feature];
    }

    /**
     * Get the text channel from the cache and if is not load fetch it from the guild manager
     *
     * @param client The Discord.js client.
     * @param channel The channel information.
     *
     * @returns The Discord channel.
     */
    private async fetchChannel(client: Client, channel: Channel): Promise<TextChannel> {
        const chan: TextChannel | undefined = <TextChannel>client.channels.cache.get(channel.id);

        if (!chan) {
            const g: Guild = await client.guilds.fetch(channel.guild);
            return <TextChannel>await g.channels.fetch(channel.id);
        }

        return chan;
    }
}
