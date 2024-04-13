import { AutocompleteInteraction, ChatInputCommandInteraction, Client, Events, Interaction } from 'discord.js';
import { BotEvent } from './types/bot-event.type';
import { Logger } from '../../shared/classes/logger';
import { SlashCommandModel } from '../slash-commands/model/slash-command.model';
import { basename } from 'node:path';

const logger: Logger = new Logger(basename(__filename));

/**
 * Retrieves the corresponding slash command model based on the provided command name.
 *
 * @param {{ commandName: string }} interaction - The interaction object containing the command name.
 *
 * @returns {SlashCommandModel | undefined} - The corresponding slash command model if found, otherwise undefined.
 */
function getCommand(interaction: { commandName: string }): SlashCommandModel | undefined {
    try {
        return require(`../slash-commands/${interaction.commandName}.slash-command`).command;
    } catch (err) {
        return undefined;
    }
}

/**
 * Handles the execution of chat input commands.
 *
 * @param {ChatInputCommandInteraction} interaction - The interaction object representing the chat input command.
 * @param {Client} client - The Discord client instance.
 */
async function chatInputCommand(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
    const command: SlashCommandModel | undefined = getCommand(interaction);

    if (!command) {
        throw Error(`Command ${interaction.commandName} not found`);
    }

    try {
        logger.info(
            `User {} send slash command : {}`,
            interaction.user.username,
            command.name + (interaction?.options.getSubcommand(false) ? ' ' + interaction?.options.getSubcommand() : '')
        );
        await command.execute(interaction, client);
    } catch (error) {
        logger.error(`${error}`, error);
    }
}

/**
 * Handles autocomplete interactions for slash commands.
 *
 * @param {AutocompleteInteraction} interaction - The autocomplete interaction object.
 */
async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command: SlashCommandModel | undefined = getCommand(interaction);

    if (!command) {
        throw Error(`Command ${interaction.commandName} not found`);
    }

    try {
        await command.autocomplete(interaction);
    } catch (error) {
        logger.error(`${error}`, error);
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(client: Client, interaction: Interaction): Promise<void> {
        if (interaction.isChatInputCommand()) {
            await chatInputCommand(interaction, client);
        } else if (interaction.isAutocomplete()) {
            await autocomplete(interaction);
        }
    },
} as BotEvent;
