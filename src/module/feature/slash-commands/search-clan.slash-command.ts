import { ChatInputCommandInteraction, Client, Colors, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { SlashCommandModel } from './model/slash-command.model';
import { FeatureSingleton } from '../../shared/singleton/feature.singleton';
import { InventorySingleton } from '../../shared/singleton/inventory.singleton';

export const command: SlashCommandModel = new SlashCommandModel(
    'search-clan',
    "Affiche l'ensemble des clans détectés après l'analyse des joueurs",
    async (interaction: ChatInputCommandInteraction, client?: Client): Promise<void> => {
        const feature: FeatureSingleton = FeatureSingleton.instance;

        if (feature.potentialClan.length === 0) {
            await interaction.reply({
                ephemeral: true,
                content: 'Aucun clan potentiel est présent dans la liste',
            });
            return;
        }

        const inventory: InventorySingleton = InventorySingleton.instance;
        const channel: TextChannel = await inventory.getChannelForFoldRecruitment(client as Client);

        const numberOfEmbed: number = Math.floor(feature.potentialClan.length / 40);
        let index: number = 0;

        for (let i = 0; i < numberOfEmbed; i++) {
            const embed: EmbedBuilder = new EmbedBuilder().setTitle('Liste des clans détectés').setColor(Colors.DarkGold);

            for (let j = 0; j < 3; j++) {
                let message: string = '';
                while (message.length < 950 && index < feature.potentialClan.length) {
                    const potentialClan: string = feature.potentialClan[index];
                    message += `[${potentialClan.slice(35, 44)}](${potentialClan})\n`;
                    index++;
                }

                if (message) {
                    embed.addFields({
                        name: `Page ${j + 1}/3`,
                        value: message,
                        inline: true,
                    });
                }
            }

            await channel.send({ embeds: [embed] });
        }

        feature.potentialClan = [];
    },
    {
        permission: PermissionsBitField.Flags.MoveMembers,
    }
);