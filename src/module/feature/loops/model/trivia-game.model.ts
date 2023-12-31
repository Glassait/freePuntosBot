import { InventoryInjector, LoggerInjector, StatisticInjector } from '../../../shared/decorators/injector.decorator';
import { Logger } from '../../../shared/classes/logger';
import { TriviaType } from '../../../shared/types/inventory.type';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Client,
    Colors,
    ComponentType,
    EmbedBuilder,
    Message,
    TextChannel,
} from 'discord.js';
import { InventorySingleton } from '../../../shared/singleton/inventory.singleton';
import { RandomUtil } from '../../../shared/utils/random.util';
import { TankopediaVehiclesSuccess, VehicleData } from '../types/wot-api.type';
import { WotApiModel } from './wot-api.model';
import { StatisticSingleton } from 'src/module/shared/singleton/statistic.singleton';
import {
    MonthlyTriviaOverallStatisticType,
    MonthlyTriviaPlayerStatisticType,
    TriviaPlayerStatisticType,
    TriviaStatisticType,
} from '../../../shared/types/statistic.type';
import { ShellEnum } from '../enums/shell.enum';
import { TimeEnum } from '../../../shared/enums/time.enum';
import { TimeUtil } from '../../../shared/utils/time.util';
import { PlayerAnswer } from '../types/trivia-game.type';

/**
 * This class is responsible for managing the trivia game.
 */
@LoggerInjector
@InventoryInjector
@StatisticInjector
export class TriviaGameModel {
    /**
     * Maximum time allowed for a player to answer the trivia question.
     */
    public readonly MAX_TIME: number = TimeEnum.MINUTE * 5;

    /**
     * The information fetch from the inventory
     * @private
     */
    private trivia: TriviaType;
    /**
     * Channel where the trivia game is being played.
     * @private
     */
    private channel: TextChannel;
    /**
     * Array of all tanks used in the trivia game.
     * @private
     */
    private allTanks: VehicleData[];
    /**
     * Tank selected for the current trivia game.
     * @private
     */
    private datum: VehicleData;
    /**
     * Message containing the trivia game components.
     * @private
     */
    private gameMessage: Message<true>;
    /**
     * Timestamp when the trivia game started.
     * @private
     */
    private timer: number;
    /**
     * Mapping of players and their answers.
     * @private
     */
    private playerAnswer: { [key: string]: PlayerAnswer } = {};
    /**
     * Trivia statistics.
     * @private
     */
    private triviaStats: TriviaStatisticType;

    /**
     * Medals to be awarded to the top 3 players.
     * @private
     */
    private readonly MEDAL: string[] = ['🥇', '🥈', '🥉'];
    /**
     * @instance of the logger.
     * @private
     */
    private readonly logger: Logger;
    /**
     * @instance of the inventory service.
     * @private
     */
    private readonly inventory: InventorySingleton;
    /**
     * @instance of the WoT API service.
     * @private
     */
    private readonly wotApi: WotApiModel = new WotApiModel();
    /**
     * @instance of the statistic service.
     * @private
     */
    private readonly statisticSingleton: StatisticSingleton;
    /**
     * Embed used to display information about the trivia game.
     * @private
     */
    private readonly startGameEmbed: EmbedBuilder = new EmbedBuilder().setTitle('Trivia Game').setColor(Colors.Aqua);
    /**
     * Embed used to display the answer to the trivia question and the top 3 players.
     * @private
     */
    private readonly answerEmbed: EmbedBuilder = new EmbedBuilder().setTitle('Trivia Game : RÉSULTAT').setColor(Colors.Green);
    /**
     * The max time to give bonus elo to the player
     * @private
     */
    private readonly responseTimeLimit = TimeEnum.SECONDE * 10;

    /**
     * Fetches the necessary services and initializes the model.
     * @param client Discord client.
     */
    public async fetchMandatory(client: Client): Promise<void> {
        this.channel = await this.inventory.getChannelForTrivia(client);
        this.trivia = this.inventory.trivia;
        this.triviaStats = this.statisticSingleton.trivia;
    }

    /**
     * Fetches the tanks to be used in the trivia game.
     */
    public async fetchTanks(): Promise<void> {
        this.logger.trace('Start fetching tanks');
        const pages: number[] = RandomUtil.getArrayWithRandomNumber(4, this.trivia.limit, 1);
        const tankopediaResponses: TankopediaVehiclesSuccess[] = [];

        for (const page of pages) {
            tankopediaResponses.push(await this.wotApi.fetchTankopediaApi(this.trivia.url.replace('pageNumber', String(page))));
        }

        if (tankopediaResponses[0].meta.count !== this.trivia.limit) {
            this.trivia.limit = tankopediaResponses[0].meta.page_total;
            this.inventory.trivia = this.trivia;
        }

        this.allTanks = tankopediaResponses.reduce((data: VehicleData[], vehicles: TankopediaVehiclesSuccess): VehicleData[] => {
            data.push(vehicles.data[Object.keys(vehicles.data)[0]]);
            return data;
        }, []);

        this.datum = this.allTanks[RandomUtil.getRandomNumber(this.allTanks.length - 1)];
        this.logger.trace(`Tank for game selected : \`${this.datum.name}\``);
    }

    /**
     * Sends a message to the trivia game channel with information about the game and the selected tank.
     */
    public async sendMessageToChannel(): Promise<void> {
        const target = new Date();
        target.setMinutes(target.getMinutes() + this.MAX_TIME / TimeEnum.MINUTE);
        this.startGameEmbed.setFields(
            {
                name: ' Règle du jeu',
                value: `Les règles sont simples :\n\t - ✏ 1 obus,\n- 🚗 4 chars  tier X,\n- ✔ 1 bonne réponse (⚠️Quand 2 ou plusieurs chars on le même obus, tous ces chars sont des bonnes réponses),\n- 🕒 ${
                    this.MAX_TIME / TimeEnum.MINUTE
                } minutes (fini <t:${TimeUtil.convertToUnix(target)}:R>).\n**⚠️ Ce n'est pas forcèment le dernier canon utilisé !**`,
            },
            {
                name: 'Obus :',
                value: `\`${ShellEnum[this.datum.default_profile.ammo[0].type as keyof typeof ShellEnum]} ${
                    this.datum.default_profile.ammo[0].damage[1]
                }\``,
                inline: true,
            }
        );

        const row: ActionRowBuilder<ButtonBuilder> = this.allTanks.reduce(
            (rowBuilder: ActionRowBuilder<ButtonBuilder>, data: VehicleData) => {
                rowBuilder.addComponents(new ButtonBuilder().setCustomId(`${data.name}`).setLabel(data.name).setStyle(ButtonStyle.Primary));
                return rowBuilder;
            },
            new ActionRowBuilder<ButtonBuilder>()
        );

        this.gameMessage = await this.channel.send({
            content: '@here',
            embeds: [this.startGameEmbed],
            components: [row],
        });
        this.logger.trace('Trivia game message send to the guild');
        this.timer = Date.now();
    }

    /**
     * Collects the answers from the players.
     */
    public async collectAnswer(): Promise<void> {
        this.logger.trace('Collecting player answer start');
        this.playerAnswer = {};
        this.gameMessage
            .createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: this.MAX_TIME,
            })
            .on('collect', async (interaction: ButtonInteraction<'cached'>): Promise<void> => {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    this.logger.trace(
                        `${interaction.member.nickname ?? interaction.user.displayName} answer to the trivia game with : \`${
                            interaction.customId
                        }\``
                    );
                    this.playerAnswer[interaction.user.username] = {
                        responseTime: Date.now() - this.timer,
                        response: interaction.customId,
                        interaction: interaction,
                    };
                    await interaction.editReply({
                        content: `Ta réponse \`${interaction.customId}\` à bien été pris en compte !`,
                    });
                } catch (e) {
                    this.logger.error(`Error during collection of answer${e}`);
                }
            });
    }

    /**
     * Sends the answer to the trivia game channel and updates the player statistics.
     */
    public async sendAnswerToChannel(): Promise<void> {
        this.logger.trace('Collect answer end. Start calculating the scores');
        const playersResponse: [string, PlayerAnswer][] = Object.entries(this.playerAnswer).sort(
            (a: [string, PlayerAnswer], b: [string, PlayerAnswer]) => a[1].responseTime - b[1].responseTime
        );

        this.answerEmbed.setImage(this.datum.images.big_icon).setDescription(`Le char à deviner était : \`${this.datum.name}\``);
        const otherAnswer: string[] = ['Les autres bonnes réponses sont :'];
        this.allTanks.forEach((vehicle: VehicleData): void => {
            if (
                vehicle.name !== this.datum.name &&
                vehicle.default_profile.ammo[0].type === this.datum.default_profile.ammo[0].type &&
                vehicle.default_profile.ammo[0].damage[1] === this.datum.default_profile.ammo[0].damage[1]
            ) {
                otherAnswer.push(vehicle.name);
            }
        });
        this.answerEmbed.setFields([]);
        if (otherAnswer.length > 1) {
            this.answerEmbed.setFields({ name: 'Autre bonne réponses :', value: otherAnswer.join('\n') });
        }

        let description: string = playersResponse.length > 0 ? '' : "Aucun joueur n'a envoyé de réponse !";

        const goodAnswer: [string, PlayerAnswer][] = playersResponse.filter((value: [string, PlayerAnswer]): boolean =>
            this.isGoodAnswer(value)
        );

        for (let i = 0; i < 3; i++) {
            if (goodAnswer[i]) {
                description += `${this.MEDAL[i]} ${goodAnswer[i][0]} en ${this.calculateResponseTime(goodAnswer[i])}\n`;
            }
        }

        description = description || "Aucun joueur n'a trouvé la bonne réponse !";

        const playerEmbed: EmbedBuilder = new EmbedBuilder()
            .setTitle('Joueurs')
            .setDescription(description)
            .setColor(playersResponse.length === 0 ? Colors.Red : Colors.Gold);

        await this.gameMessage.edit({ embeds: [this.answerEmbed, playerEmbed], components: [] });
        this.logger.trace('Game message update with answer and top 3 players');

        await this.updateStatistic(playersResponse);
    }

    /**
     * Calculates the time taken by the player to answer the trivia question.
     * @param playersResponse Array of players and their responses.
     * @returns The time taken by the player to answer the trivia question.
     */
    private calculateResponseTime(playersResponse: [string, PlayerAnswer]): string {
        const sec = playersResponse[1].responseTime / TimeEnum.SECONDE;
        return sec > 60 ? `${Math.floor(sec / 60)}:${Math.round(sec % 60)} minutes` : `${sec.toFixed(2)} secondes`;
    }

    /**
     * Checks if the player's answer is correct.
     * @param playerResponse The player's response.
     * @returns `true` if the player's answer is correct, `false` otherwise.
     */
    private isGoodAnswer(playerResponse: [string, PlayerAnswer]): boolean {
        return playerResponse[1].response === this.datum.name || this.isAnotherTanks(playerResponse);
    }

    /**
     * This method check if there are another tanks that have the same shell (damage and type)
     * @param playerResponse The answer of the player
     * @private
     */
    private isAnotherTanks(playerResponse: [string, PlayerAnswer]): boolean {
        const vehicle: VehicleData | undefined = this.allTanks.find(
            (vehicle: VehicleData): boolean => vehicle.name === playerResponse[1].response
        );

        if (!vehicle) {
            return false;
        }

        return (
            vehicle.default_profile.ammo[0].type === this.datum.default_profile.ammo[0].type &&
            vehicle.default_profile.ammo[0].damage[1] === this.datum.default_profile.ammo[0].damage[1]
        );
    }

    /**
     * Updates the overall and player statistics for the trivia game.
     * @param responses Array of players and their responses.
     */
    private async updateStatistic(responses: [string, PlayerAnswer][]): Promise<void> {
        this.logger.trace('Start updating the overall statistics');
        const overall: MonthlyTriviaOverallStatisticType = this.triviaStats.overall[this.statisticSingleton.currentMonth] ?? {
            number_of_game: 0,
            game_without_participation: 0,
        };

        overall.number_of_game++;

        if (responses.length === 0) {
            overall.game_without_participation++;
        }
        this.triviaStats.overall[this.statisticSingleton.currentMonth] = overall;

        this.logger.trace("Start updating the player's statistics");

        for (const response of responses) {
            this.logger.trace(`Start updating ${response[0]} statistic`);
            const player: TriviaPlayerStatisticType = this.triviaStats.player[response[0]] ?? {};

            const playerStat: MonthlyTriviaPlayerStatisticType = player[this.statisticSingleton.currentMonth] ?? {
                elo: 0,
                right_answer: 0,
                win_strick: 0,
                answer_time: [],
                participation: 0,
            };
            playerStat.participation++;
            playerStat.answer_time.push(response[1].responseTime);

            const oldElo = playerStat.elo;
            playerStat.elo = this.calculateElo(playerStat, response);

            if (this.isGoodAnswer(response)) {
                playerStat.right_answer++;
                playerStat.win_strick++;
                await response[1].interaction.editReply({
                    content: `Tu as eu la bonne réponse, bravo :clap:.\nTon nouvelle elo est : \`${playerStat.elo}\` (modification de \`${
                        playerStat.elo - oldElo
                    }\`)`,
                });
                this.logger.trace(`Player ${response[0]} found the right answer`);
            } else {
                playerStat.win_strick = 0;
                const tank = this.allTanks.find((tank: VehicleData): boolean => tank.name === response[1].response);

                if (!tank) {
                    return;
                }

                await response[1].interaction.editReply({
                    content: `Tu n'as pas eu la bonne réponse !.\nLe char \`${tank.name}\` a pour obus \`${
                        ShellEnum[tank.default_profile.ammo[0].type as keyof typeof ShellEnum]
                    }\` avec un aplha de \`${tank.default_profile.ammo[0].damage[1]}\`.\nTon nouvelle elo est : \`${
                        playerStat.elo
                    }\` (modification de \`${playerStat.elo - oldElo}\`)`,
                });
                this.logger.trace(`Player ${response[0]} failed to find the right answer`);
            }

            player[this.statisticSingleton.currentMonth] = playerStat;
            this.triviaStats.player[response[0]] = player;
            this.logger.trace(`End updating ${response[0]} statistic`);
        }

        this.statisticSingleton.trivia = this.triviaStats;
    }

    /**
     * Calculates the new ELO score based on the player's previous score and the response.
     * @param playerStat The player's previous score.
     * @param response The player's response.
     * @returns The new ELO score.
     */
    private calculateElo(playerStat: MonthlyTriviaPlayerStatisticType, response: [string, any]): number {
        let gain = -Math.floor(60 * Math.exp(0.0001 * playerStat.elo));
        if (this.isGoodAnswer(response)) {
            gain = Math.floor(60 * Math.exp(-0.0001 * playerStat.elo));

            if (response[1].responseTime <= this.responseTimeLimit) {
                gain += Math.floor((gain / 3) * ((this.responseTimeLimit - response[1].responseTime) / this.responseTimeLimit));
            }
        }

        const newElo: number = playerStat.elo + gain;
        return newElo < 0 ? 0 : newElo;
    }
}
