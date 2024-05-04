import { TableAbstract } from '../abstracts/table.abstract';
import { SelectBuilder } from '../builders/query.builder';
import { LoggerInjector } from '../decorators/injector.decorator';

type WotApi = 'image_url' | 'player_url' | 'player_personal_data' | 'trivia';

/**
 * Represents a table for storing World of Tanks API URLs.
 */
@LoggerInjector
export class WotApiTable extends TableAbstract {
    constructor() {
        super('wot_api');
    }

    /**
     * Retrieves the URL associated with a specific type of World of Tanks API.
     *
     * @param {WotApi} name - The type of World of Tanks API.
     *
     * @returns {Promise<string>} - The URL associated with the specified type of World of Tanks API.
     */
    public async getUrl(name: WotApi): Promise<string> {
        return ((await this.select(new SelectBuilder(this).columns('url').where([`name LIKE '${name}'`]))) as any)[0].url;
    }
}
