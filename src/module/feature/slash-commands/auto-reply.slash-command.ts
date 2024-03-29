import { SlashCommandMentionableOption, SlashCommandStringOption } from '@discordjs/builders';
import { ChatInputCommandInteraction, CommandInteractionOption, GuildMember } from 'discord.js';
import { FeatureSingleton } from '../../shared/singleton/feature.singleton';
import { Context } from '../../shared/classes/context';
import { SlashCommandModel } from './model/slash-command.model';
import { UserUtil } from '../../shared/utils/user.util';
import { Logger } from '../../shared/classes/logger';

const logger: Logger = new Logger(new Context('AUTO-REPLY-SLASH-COMMAND'));

export const command: SlashCommandModel = new SlashCommandModel(
    'auto-reply',
    "Pour répondre automatiquement lorsqu'une personne vous mention",
    async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const targetUser: GuildMember | undefined = await UserUtil.getGuildMemberFromInteraction(interaction, 'utilisateur', true);
        const option: CommandInteractionOption | null = interaction.options.get('désactiver');
        const feature: FeatureSingleton = FeatureSingleton.instance;

        if (targetUser && !option) {
            const alreadyAutoReply: boolean = feature.hasAutoReplyTo(interaction.user.id, targetUser.id);

            if (alreadyAutoReply) {
                logger.warn(`AutoReply already activated for {} to reply to {}`, interaction.user.displayName, targetUser.displayName);
                await interaction.editReply({
                    content: `Tu as déjà une réponse automatique mis en place pour <@${targetUser.id}>`,
                });
                return;
            }

            logger.info(`AutoReply activated for {} to reply to {}`, interaction.user.displayName, targetUser.displayName);
            feature.addAutoReply({ activateFor: interaction.user.id, replyTo: targetUser.id });
            await interaction.editReply({
                content: `Réponse automatique mis en place pour <@${targetUser.id}>`,
            });
        } else if (targetUser) {
            logger.info(`AutoReply deactivated for {} to reply to {}`, interaction.user.displayName, targetUser.displayName);
            feature.deleteAutoReply(interaction.user.id, targetUser.id);
            await interaction.editReply({
                content: `Réponse automatique désactiver pour <@${targetUser.id}>`,
            });
        } else {
            logger.warn('Technical error when activating autoReply');
            await interaction.editReply({
                content: 'Technical error',
            });
        }
    },
    {
        option: [
            new SlashCommandMentionableOption()
                .setName('target')
                .setDescription("L'utilisateur à répondre automatiquement.")
                .setRequired(true),
            new SlashCommandStringOption()
                .setName('désactiver')
                .setDescription("Renseigner pour désactiver la réponse automatique pour l'utilisateur")
                .setChoices({ name: 'oui', value: 'oui' }),
        ],
    }
);
