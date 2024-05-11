import { TableAbstract } from '../abstracts/table.abstract';
import { SelectBuilder } from '../builders/query.builder';
import { LoggerInjector } from '../decorators/injector.decorator';

/**
 * Represents the name of a feature for feature flipping.
 */
type FeatureFlippingName =
    | 'trivia'
    | 'trivia_month'
    | 'fold_recruitment'
    | 'scrap_website'
    | 'search_clan'
    | (string & Record<string, never>);

/**
 * Represents a table to manage feature flipping in the database.
 */
@LoggerInjector
export class FeatureFlippingTable extends TableAbstract {
    constructor() {
        super('feature_flipping');
    }

    /**
     * Retrieves the activation status of a feature from the database.
     *
     * @param {FeatureFlippingName} name - The name of the feature.
     *
     * @returns {Promise<boolean>} A promise that resolves to the activation status of the feature.
     */
    public async getFeature(name: FeatureFlippingName): Promise<boolean> {
        return !!((await this.select(new SelectBuilder(this).columns('is_activated').where([`name like '${name}'`]))) as any)[0]
            .is_activated;
    }
}
