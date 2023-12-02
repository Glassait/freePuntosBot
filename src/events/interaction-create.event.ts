import { ChatInputCommandInteraction, Client, Events, Interaction } from 'discord.js';
import { LoggerSingleton } from '../singleton/logger.singleton';
import { BotEvent } from '../types/bot-event.type';
import { Context } from '../utils/context.class';
import { EnvUtil } from '../utils/env.util';
import { SendUtils } from '../utils/send.utils';
import { SlashCommand } from '../utils/slash-command.class';

const logger: LoggerSingleton = LoggerSingleton.instance;
const context: Context = new Context('INTERACTION-CREATE-EVENT');

function getCommand(interaction: ChatInputCommandInteraction): SlashCommand | undefined {
    return require(`../slash-commands/${interaction.commandName}.slash-command`).command;
}

const event: BotEvent = {
    name: Events.InteractionCreate,
    once: false,
    async execute(_client: Client, interaction: Interaction): Promise<void> {
        let command: SlashCommand | undefined;

        if (interaction.isChatInputCommand()) {
            if (EnvUtil.isDev()) {
                await SendUtils.reply(interaction, {
                    content: "Je suis actuellement entrain d'être améliorer par mon créateur, cette commande ne fonctionne pas !\nMerci d'éssayer plus tard :)",
                    ephemeral: true,
                });
                return;
            }

            command = getCommand(interaction);

            if (!command) {
                logger.error(context, `No slash commands matching \`${interaction.commandName}\` was found.`);
                return;
            }

            try {
                logger.trace(context, `Chat input command received : \`${command.name}\``);
                await command.execute(interaction);
            } catch (error) {
                logger.error(context, `${error}`);
            }
        }
    },
};

export default event;
