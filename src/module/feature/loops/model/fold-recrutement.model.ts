import { AxiosInjector, InventoryInjector, LoggerInjector } from '../../../shared/decorators/injector.decorator';
import { Logger } from '../../../shared/classes/logger';
import { AxiosInstance } from 'axios';
import { ClanActivity, FoldRecrutementType, LeaveClanActivity, Players } from '../types/fold-recrutement.type';
import { InventorySingleton } from '../../../shared/singleton/inventory.singleton';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Colors, EmbedBuilder, TextChannel } from 'discord.js';
import { EnvUtil } from '../../../shared/utils/env.util';
import { TimeEnum } from '../../../shared/enums/time.enum';
import { Clan } from '../../../shared/types/feature.type';

@LoggerInjector
@AxiosInjector
@InventoryInjector
export class FoldRecrutementModel {
    /**
     * The base url for the wargaming
     * @private
     */
    private readonly url: string = 'https://eu.wargaming.net/clans/wot/clanID/newsfeed/api/events/?date_until=today&offset=3600';
    /**
     * The base url for the image
     * @private
     */
    private readonly image: string = 'https://eu.wargaming.net/clans/media/clans/emblems/cl_605/clanID/emblem_64x64.png';
    /**
     * The base url of tomatoGG
     * @private
     */
    private readonly tomato: string = 'https://tomato.gg/stats/EU/name%3Did';
    /**
     * The base url of WoT
     * @private
     */
    private readonly wot: string = 'https://worldoftanks.eu/fr/community/accounts/id-name/';
    /**
     * The base url of Wot Life
     * @private
     */
    private readonly wotLife: string = 'https://fr.wot-life.com/eu/player/name-id/';
    /**
     * The limite date to not take player
     * @private
     */
    private limiteDate: Date = new Date('2024-01-03T00:00:00');
    /**
     * @instance Of the logger
     * @private
     */
    private readonly logger: Logger;
    /**
     * @instance Of the axios
     * @private
     */
    private readonly axios: AxiosInstance;
    /**
     * @instance Of the inventory
     * @private
     */
    private readonly inventory: InventorySingleton;

    /**
     * The data fetch form the Wargaming api
     * @private
     */
    private data: FoldRecrutementType;
    /**
     * The channel to send the leaving player inside
     * @private
     */
    private channel: TextChannel;
    /**
     * The total number of players who leaved there clan
     * @private
     */
    private totalNumberOfPlayers: number = 0;

    /**
     * Fetch the mandatory information form the inventory
     * @param client
     */
    public async fetchMandatory(client: Client): Promise<void> {
        this.channel = await this.inventory.getChannelForFoldRecrutement(client);
    }

    /**
     * Fetch the activity of the clan
     * @param clanId The id of the clan²
     */
    public async fetchClanActivity(clanId: string): Promise<void> {
        const url = this.url.replace('clanID', clanId).replace('today', new Date().toISOString().slice(0, 19));
        this.logger.info(`Fetching activity of the clan with url: ${url}`);
        this.data = (await this.axios.get(url)).data;
    }

    /**
     * Extracts players who left the clan and sends a message with their information in the channel
     */
    public async sendMessageToChannelFromExtractedPlayer(clan: Clan): Promise<void> {
        let extracted: LeaveClanActivity[] = this.data.items.filter(
            (item: ClanActivity): boolean => item.subtype === 'leave_clan' && new Date(item.created_at) > this.limiteDate
        ) as unknown as LeaveClanActivity[];

        const lastClan = this.inventory.getLastClan(clan.id);
        if (lastClan) {
            const last = extracted.find((value: LeaveClanActivity): boolean => value.created_at === lastClan);

            if (last) {
                const index = extracted.indexOf(last);
                extracted = extracted.slice(0, index);
            }
        }

        const datum: Players[] = extracted.reduce((players: Players[], currentValue: LeaveClanActivity) => {
            currentValue.accounts_ids.reduce((players1: Players[], id: number) => {
                players1.push({
                    name: currentValue.accounts_info[String(id)].name,
                    id: id,
                });

                return players1;
            }, players);

            return players;
        }, []);

        this.logger.debug(`${datum.length} players leaves the clan`);

        if (datum.length > 0) {
            const embed = new EmbedBuilder()
                .setColor(Colors.Fuchsia)
                .setTitle(clan.name)
                .setThumbnail(this.image.replace('clanID', clan.id))
                .setDescription("Il semblerai qu'il y ait des joueurs qu'ont quitté le clan.")
                .setFields({ name: 'Nombre de joueurs quittés', value: datum.length.toString() });

            this.totalNumberOfPlayers += datum.length;

            await this.channel.send({ embeds: [embed] });
        }

        for (const player of datum) {
            const embedPlayer: EmbedBuilder = new EmbedBuilder()
                .setTitle('Nouveau joueur pouvant être recruté')
                .setDescription(`Le joueur suivant \`${player.name}\` a quitté \`${clan.name}\``)
                .setColor(Colors.Blurple);

            const wotButton = new ButtonBuilder()
                .setURL(this.wot.replace('name', player.name).replace('id', String(player.id)))
                .setLabel('Site de WoT')
                .setStyle(ButtonStyle.Link);

            const tomatoButton = new ButtonBuilder()
                .setURL(this.tomato.replace('name', player.name).replace('id', String(player.id)))
                .setLabel('Site de TomatoGG')
                .setStyle(ButtonStyle.Link);

            const wotLifeButton = new ButtonBuilder()
                .setURL(this.wotLife.replace('name', player.name).replace('id', String(player.id)))
                .setLabel('Site de Wot Life')
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder<ButtonBuilder>().setComponents(wotButton, tomatoButton, wotLifeButton);

            await this.channel.send({
                embeds: [embedPlayer],
                components: [row],
            });

            if (datum.length > 1) {
                await EnvUtil.sleep(TimeEnum.MINUTE);
            }
        }

        if (extracted[0]) {
            this.inventory.updateLastClan(clan.id, extracted[0].created_at);
        }
    }

    /**
     * Send the footer of the message
     */
    public async sendFooter(): Promise<void> {
        if (this.totalNumberOfPlayers === 0) {
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(Colors.Yellow)
            .setTitle('Nombre total de joueurs ayant quitté leur clan')
            .setDescription(`Un total de \`${this.totalNumberOfPlayers}\` joueur(s) qui ont quitté(s) leur clan`);

        await this.channel.send({ embeds: [embed] });
    }
}