import { Logger } from '../classes/logger';
import { Context } from '../classes/context';
import {
    FoldRecruitmentClanStatisticType,
    MonthlyFoldRecruitmentClanStatisticType,
    StatisticType,
    TriviaPlayerStatisticType,
    TriviaStatisticType,
} from '../types/statistic.type';
import { FileUtil } from '../utils/file.util';
import { readFileSync } from 'fs';

/**
 * This class keep track of the statistics for the different games
 */
export class StatisticSingleton {
    //region PUBLIC FIELD
    /**
     * Keep track of the current month for the statistic
     */
    public currentMonth: string = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    //endregion

    //region PRIVATE READONLY
    /**
     * The path to the statistic.json file
     */
    private readonly path: string = './src/module/core/statistic.json';
    /**
     * The backup file path to the statistic.json file
     */
    private readonly backupPath: string = './src/module/core/backup/statistic.json';
    /**
     * The logger to log thing
     */
    private readonly logger: Logger = new Logger(new Context(StatisticSingleton.name));
    /**
     * Represents the initial value for the statistics data.
     */
    private readonly INITIAL_VALUE: StatisticType = {
        version: 2,
        trivia: {
            version: 3,
            overall: {},
            player: {},
        },
        fold_recruitment: {
            version: 1,
            clan: {},
        },
    };
    /**
     * The statistic
     */
    private readonly _data: StatisticType = this.INITIAL_VALUE;
    //endregion

    /**
     * Private constructor to respect singleton pattern
     */
    private constructor() {
        this._data = JSON.parse(readFileSync(this.path).toString());

        this._data.version = this.INITIAL_VALUE.version;

        if (this._data.trivia) {
            this._data.trivia.version = this.INITIAL_VALUE.trivia.version;
        } else {
            this._data.trivia = this.INITIAL_VALUE.trivia;
            FileUtil.writeIntoJson(this.path, this._data);
        }

        if (this._data.fold_recruitment) {
            this._data.fold_recruitment.version = this.INITIAL_VALUE.fold_recruitment.version;
        } else {
            this._data.fold_recruitment = this.INITIAL_VALUE.fold_recruitment;
            FileUtil.writeIntoJson(this.path, this._data);
        }
    }

    //region SINGLETON
    /**
     * The instance of the class, used for the singleton pattern
     */
    private static _instance: StatisticSingleton;

    /**
     * Getter for the {@link _instance}
     */
    public static get instance(): StatisticSingleton {
        if (!this._instance) {
            this._instance = new StatisticSingleton();
            this._instance.logger.info('{} instance initialized', 'Statistic');
        }
        return this._instance;
    }
    //endregion

    //region TRIVIA-GET-SET
    /**
     * Gets the trivia-related statistics, including overall and player-specific data.
     *
     * @returns {TriviaStatisticType} - Trivia-related statistics.
     *
     * @example
     * ```typescript
     * const triviaStats = instance.trivia;
     * console.log(triviaStats); // { version: 3, overall: {}, player: {} }
     * ```
     */
    public get trivia(): TriviaStatisticType {
        return this._data.trivia;
    }

    /**
     * Sets the trivia-related statistics and writes the updated data to the JSON file.
     *
     * @param {TriviaStatisticType} trivia - The updated trivia-related statistics.
     *
     * @example
     * ```typescript
     * const newTriviaStats = { version: 4, overall: { `updated overall data` }, player: { `updated player data` } };
     * instance.trivia = newTriviaStats;
     * ```
     */
    public set trivia(trivia: TriviaStatisticType) {
        this._data.trivia = trivia;
        FileUtil.writeIntoJson(this.path, this._data);
    }
    //endregion

    /**
     * Backs up the current data of the inventory singleton by writing it into a JSON file.
     */
    public backupData(): void {
        this.logger.info('Backing up {}', StatisticSingleton.name);
        FileUtil.writeIntoJson(this.backupPath, this._data);
    }

    /**
     * Gets the player-specific trivia statistics for a specific player.
     *
     * @param {string} playerId - The ID of the player for whom to retrieve statistics.
     * @returns {TriviaPlayerStatisticType} - Player-specific trivia statistics.
     *
     * @example
     * ```typescript
     * const playerId = '123456789';
     * const playerStats = instance.getPlayerStatistic(playerId);
     * console.log(playerStats); // { elo: 1500, participation: 5, right_answer: 2, answer_time: [ `array of answer times` ], win_strick: { current: 1, max: 2 } }
     * ```
     */
    public getPlayerStatistic(playerId: string): TriviaPlayerStatisticType {
        return this._data.trivia.player[playerId];
    }

    /**
     * Updates the fold recruitment statistics for a specific clan, including the number of leaving players.
     *
     * @param {string} clanId - The ID of the clan for which to update the statistics.
     * @param {number} leavingPlayer - The number of leaving players to add to the statistics.
     *
     * @example
     * ```typescript
     * const clanID = 'ABC123';
     * const leavingPlayerCount = 3;
     * instance.updateClanStatistics(clanID, leavingPlayerCount);
     * ```
     */
    public updateClanStatistics(clanId: string, leavingPlayer: number): void {
        this.logger.debug(`Updating statistic for {}, by adding {}`, clanId, String(leavingPlayer));

        const clanStats: FoldRecruitmentClanStatisticType = this._data.fold_recruitment.clan[clanId] ?? {};
        const monthStats: MonthlyFoldRecruitmentClanStatisticType = clanStats[this.currentMonth] ?? {
            leaving_player: 0,
        };

        monthStats.leaving_player += leavingPlayer;
        clanStats[this.currentMonth] = monthStats;
        this._data.fold_recruitment.clan[clanId] = clanStats;

        FileUtil.writeIntoJson(this.path, this._data);
    }

    /**
     * Retrieves the fold recruitment statistics for a specific clan based on its ID.
     *
     * @param {string} clanId - The ID of the clan for which to retrieve the statistics.
     * @returns {FoldRecruitmentClanStatisticType} - The fold recruitment statistics for the specified clan.
     *
     * @example
     * ```typescript
     * const clanID = 'ABC123';
     * const clanStatistics = instance.getClanStatistics(clanID);
     * console.log(clanStatistics); // Clan statistics object for the specified ID
     * ```
     */
    public getClanStatistics(clanId: string): FoldRecruitmentClanStatisticType {
        return this._data.fold_recruitment.clan[clanId];
    }
}
